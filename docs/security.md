# RepoGuard — Security

**Status:** Phase 0 deliverable. Implemented in Phases 3, 5, 23, 24.
**Posture:** RepoGuard holds read access to other people's source code. That is
the whole threat model in one sentence.

---

## 1. What we are protecting

| Asset | Exposure if lost | Where it lives |
| --- | --- | --- |
| GitHub installation tokens | Read access to private source, ~1 hr per token | Redis (TTL), `GitHubInstallation.token_encrypted` |
| GitHub App private key | Ability to mint tokens for **every** installation | Environment only |
| Webhook secret | Ability to forge analysis jobs | Environment only |
| Session cookies | Full account takeover | Browser (httpOnly), `django_session` |
| Source diffs | Customer intellectual property | `commit_files.patch`, 30-day retention |
| Analysis results | Competitive intelligence about a codebase | PostgreSQL |

The private key is the crown jewel: it does not expire, and it authorizes token
minting for every installation. It is never written to the database, never
logged, never returned by any endpoint, and never committed.

---

## 2. Secrets

**Every secret comes from the environment.** `django-environ` reads them;
`config/settings/base.py` contains no default for any of them.

```python
SECRET_KEY = env("DJANGO_SECRET_KEY")                    # no default — fails loudly
GITHUB_APP_PRIVATE_KEY = env("GITHUB_APP_PRIVATE_KEY")
GITHUB_WEBHOOK_SECRET = env("GITHUB_WEBHOOK_SECRET")
GITHUB_TOKEN_ENCRYPTION_KEY = env("GITHUB_TOKEN_ENCRYPTION_KEY")
```

Rules:

1. **No secret has a fallback default.** A missing `GITHUB_WEBHOOK_SECRET` must
   crash at startup, not silently disable signature verification. `production.py`
   asserts every required variable at import.
2. **`.env` is gitignored; `.env.example` holds placeholders only** — names and
   shapes, never values, and nothing that looks like a real key.
3. **No secret is ever logged.** A logging filter redacts any key matching
   `token|secret|password|key|authorization|cookie|private` at the formatter
   level, so even an accidental `logger.info(payload)` cannot leak one.
4. **No secret reaches the frontend.** The only GitHub-derived data crossing the
   boundary is `GitHubConnection`: `connected`, `username`, `avatarUrl`, `scopes`
   (display strings), `connectedAt`, `expired`. `services/auth.ts` already
   documents this invariant on the frontend side.
5. **Tokens are encrypted at rest** with Fernet (AES-128-CBC + HMAC) under
   `GITHUB_TOKEN_ENCRYPTION_KEY`. Database access alone does not yield tokens.
6. **Excluded from every projection:** serializers, `__str__`/`__repr__`, Django
   admin, DRF browsable API, error pages, Sentry payloads (`before_send` scrub).

Rotation: the webhook secret and encryption key support dual-read during
rotation (accept old and new, write new). The App private key rotates through
GitHub's App settings with a grace period where both keys mint valid JWTs.

---

## 3. Authentication

Cookie-based sessions. Not a preference — `lib/api/client.ts` sends
`credentials: "include"` and no `Authorization` header, so the frontend has
already chosen. It is also the safer choice: an httpOnly cookie is unreadable by
injected script, whereas a token in `localStorage` is one XSS away from theft.

```python
SESSION_COOKIE_HTTPONLY = True     # JS cannot read it
SESSION_COOKIE_SECURE   = True     # production: HTTPS only
SESSION_COOKIE_SAMESITE = "Lax"    # not sent on cross-site POST
SESSION_COOKIE_AGE      = 60 * 60 * 24 * 14        # 14 days with "remember"
SESSION_EXPIRE_AT_BROWSER_CLOSE = True             # without it
```

Password storage: Django's `PBKDF2PasswordHasher` (Argon2 available and preferred
where the runtime supports it), with all four `AUTH_PASSWORD_VALIDATORS` enabled.

Login throttling: 5 failures per email per 15 minutes and 20 per IP per 15
minutes, tracked in Redis. Failures return the **same** `401 invalid_credentials`
whether or not the account exists — the frontend's mock already models this
(`locked@repoguard.dev` → `invalid_credentials`), and differentiating would be a
user-enumeration oracle.

Registration: `409`-style `email_taken` is returned as `400` with a field error
on `email`, matching the observed contract. This *is* an enumeration surface, and
it is accepted deliberately — a registration form that cannot say "that email is
taken" is unusable, and the information is obtainable anyway through the signup
flow. Mitigated by throttling registration attempts per IP.

Session fixation: `django.contrib.auth.login()` cycles the session key on every
login. Logout flushes the session server-side, not just the cookie.

---

## 4. CSRF

Cookie auth means CSRF is a live concern, and the frontend sends no CSRF token —
there is no `X-CSRFToken` header anywhere in `lib/api/client.ts`.

The brief says not to modify the frontend without a genuine contract problem, so
the resolution is on the backend:

```python
class CookieSessionAuthentication(SessionAuthentication):
    """Session auth without DRF's CSRF enforcement.

    Cross-site protection is provided by SameSite=Lax cookies plus a strict
    CORS origin allow-list, both of which are enforced by the browser before
    a request is issued. Documented in docs/security.md §4.
    """
    def enforce_csrf(self, request):
        return None
```

Why this is defensible:

- `SameSite=Lax` means the browser does not attach the session cookie to
  cross-site POST/PUT/PATCH/DELETE at all. The classic CSRF vector — a form POST
  from `evil.com` — arrives unauthenticated.
- `CORS_ALLOWED_ORIGINS` is an explicit list. No wildcard, and
  `CORS_ALLOW_CREDENTIALS = True` with a wildcard is rejected by browsers anyway.
- Every state-changing endpoint uses POST/PATCH/DELETE. No `GET` mutates.

Why it is still written down: `SameSite=Lax` is browser-enforced, so it is a
defence we do not control. Residual risk is a browser without Lax defaults or a
future same-site subdomain compromise. The stronger fix — a `X-CSRFToken` header
from the frontend — is a two-line frontend change and is logged in
`api-contract.md` §9 as the recommended hardening once frontend edits are in
scope. **This is a deliberate, documented trade-off, not an oversight.**

Django's `CsrfViewMiddleware` stays enabled for the Django admin, which is not
served through DRF.

---

## 5. Authorization and multi-user isolation

The requirement is absolute: **User A must never reach User B's repositories,
commits, predictions, alerts, analytics, or GitHub metadata.**

### 5.1 Filtered querysets, not filtered responses

```python
class OwnedByUserMixin:
    def get_queryset(self):
        return super().get_queryset().filter(repository__owner=self.request.user)
```

Isolation is a `WHERE` clause on every query, applied in `get_queryset`, not a
check after fetching. An object the user does not own is never loaded, so it
cannot leak through a serializer, an error message, a count, or a log line.

`get_object()` on a filtered queryset raises `Http404` — which gives the right
behaviour for free: **another tenant's resource is a 404, not a 403.** A 403
confirms the id exists.

### 5.2 Where it is enforced

| Surface | Rule |
| --- | --- |
| Every list endpoint | Queryset filtered by owner |
| Every detail endpoint | Same filtered queryset → 404 on foreign ids |
| Nested routes | Parent ownership checked first (`/repositories/{id}/commits/`) |
| Query parameters | `?repository=` values validated against the user's set |
| Celery tasks | Load by id **and** owner; a task never trusts its argument |
| Webhooks | Owner derived from `installation_id`, never from the payload |
| Analytics aggregates | Grouped within the user's repositories only |
| Alerts | Scoped through repository ownership |

The Celery row matters: `analyze_commit(commit_id)` runs outside any request and
has no `request.user` to lean on. Ownership travels with the data, resolved
through `commit.repository.owner`.

### 5.3 Testing isolation

Every repository-scoped endpoint gets a parametrized test: create two users with
data, authenticate as A, request B's resource by id, assert `404` **and** assert
B's identifiers appear nowhere in the response body. Adding an endpoint without
adding it to that parametrized list is a review failure.

A second test enumerates DRF routes and asserts each one is either in the
isolation suite or on an explicit public allow-list (`/health/`, `/auth/login/`,
`/auth/register/`, `/webhooks/github/`). Endpoints do not get to be forgotten.

---

## 6. Webhook security

Covered in full in `webhook-flow.md` §3. The security-relevant essentials:

- HMAC-SHA256 over the **raw body**, compared with `hmac.compare_digest`.
- Missing or malformed signature → `401`. No unsigned path exists, in any
  environment, behind any flag.
- SHA-1 `X-Hub-Signature` is not accepted.
- Body size capped before parsing.
- Per-IP throttle on the ingress.
- Repository ownership resolved from the installation, never the payload.
- Failed verifications log source IP, event, delivery id, and the first 8 hex
  characters of the *presented* signature — never the expected one.

---

## 7. Transport and headers

```python
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

CORS:

```python
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")   # explicit, no wildcard
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["accept", "content-type", "x-requested-with"]
```

`CORS_ALLOW_ALL_ORIGINS` is never set. With credentials enabled it is both
browser-rejected and, if it worked, a complete bypass of §5.

`ALLOWED_HOSTS` is explicit in production. `DEBUG = False` is asserted, not
defaulted — a `DEBUG = True` production deploy exposes settings, stack traces,
and SQL.

---

## 8. Input validation

- **Serializers validate everything.** No view reads `request.data[...]` directly.
- **Unknown fields are rejected**, not ignored, so a typo'd field name fails loudly.
- **Bounded pagination:** `page_size` capped at 100 regardless of what is asked.
- **Ordering allow-listed:** `?ordering=` accepts a fixed set of fields. An
  unrestricted `order_by(request.GET["ordering"])` is a denial-of-service on
  unindexed columns and an information leak through timing.
- **UUID path parameters** are typed at the URL level; a malformed id 404s before
  reaching a view.
- **Search terms** are ORM parameters, never string-formatted SQL.
- **`next=` redirect targets** are allow-listed against known frontend paths.
  Open redirects on an OAuth callback are a phishing primitive.
- **Request body size** capped globally (`DATA_UPLOAD_MAX_MEMORY_SIZE`).

SQL injection: every query goes through the Django ORM. `raw()` and `extra()` are
not used; if a future aggregate needs raw SQL it must use parameter binding and
carry a review comment explaining why the ORM was insufficient. A grep for
`\.raw\(|\.extra\(|cursor\.execute` in CI keeps that honest.

---

## 9. Rate limiting

| Scope | Limit | Rationale |
| --- | --- | --- |
| Anonymous | 60/hour | Login, register, health |
| Authenticated | 1,000/hour | Normal dashboard use is well under this |
| Login attempts | 5 / 15 min per email, 20 / 15 min per IP | Credential stuffing |
| Registration | 10 / hour per IP | Automated signup |
| Analysis job creation | 10 / hour per user | Each job is minutes of worker time and GitHub quota |
| Webhook ingress | 200/min per IP | Above real GitHub rates; caps signature-guessing floods |

Throttles are Redis-backed so they hold across processes. `429` responses carry
`Retry-After`; the frontend's `ApiError.isTransient` already treats `429` as
retryable, so this composes with the client's backoff without frontend changes.

---

## 10. Data handling

**Diff retention.** Onboarding promises source is not retained after analysis.
`commit_files.patch` is nulled after `DIFF_RETENTION_DAYS` (default 30) by a
periodic job. Metrics derived from the diff persist; the source does not. This is
a product promise made in the UI before the user grants access, so it is enforced
by a job rather than by intention.

**No repository cloning.** Analysis works from the REST API. Nothing writes
customer source to a worker's disk, which removes an entire class of
cleanup-failure exposure.

**PII.** Commit author names and emails come from Git metadata. They are stored
because commit history is meaningless without them, exposed only to the
repository owner, and deleted with the account.

**Deletion.** Account deletion removes user data, tokens, and analysis results.
Repository soft-deletion (`database.md` §2) is reversible and does **not** apply
to tokens — those are purged immediately on disconnect.

**Backups** are encrypted at rest. A backup containing `token_encrypted` is only
as safe as the encryption key, which lives in the environment, not in the backup.

---

## 11. Logging

Structured JSON. Every line carries `request_id`, `user_id`, `path`, `method`,
`status`, `duration_ms`.

**Never logged:** passwords, session keys, GitHub tokens, the App private key,
webhook secrets, the encryption key, `Authorization` or `Cookie` headers, request
bodies containing credentials, full webhook payloads.

**Always logged** (audit-friendly): authentication success and failure with
source IP; GitHub connect/disconnect; repository monitoring state changes;
analysis job lifecycle; webhook receipt with signature validity; permission
denials with the attempted resource id; model promotion and rollback.

The redaction filter operates on the log record, not at call sites, because
relying on every future call site to remember is how secrets end up in logs.

Retention: 30 days for application logs, 90 for audit events. Errors go to Sentry
with `send_default_pii = False` and a `before_send` scrubber.

---

## 12. Dependencies

`pip-audit` in CI; builds fail on known-vulnerable packages. Dependabot enabled.
Versions pinned in `requirements.txt` with hashes in `requirements.lock`. Base
images pinned by digest, not tag — `python:3.13-slim` moves.

---

## 13. Deliberate residual risks

Stated rather than glossed:

1. **CSRF depends on `SameSite=Lax`** (§4). Browser-enforced. The stronger fix
   requires a frontend change.
2. **Registration reveals whether an email is registered.** Accepted for
   usability; throttled.
3. **Installation tokens are in Redis.** Redis compromise yields up to an hour of
   read access. Mitigated by TTL, and by Redis not being internet-exposed.
4. **No 2FA on RepoGuard accounts.** A later phase. GitHub's own 2FA protects the
   installation grant, not our session.
5. **No field-level encryption on diffs.** `patch` is protected by database
   encryption at rest and 30-day retention, not by column encryption.
6. **Single-tenant-per-user model.** Organizations and shared repositories are not
   modelled. When they are, §5 needs a membership table and every filter in it
   changes — which is exactly why the filters are centralized in one mixin.

---

## 14. Tests (Phase 23–25)

| Area | Test |
| --- | --- |
| Isolation | Every scoped endpoint: A requesting B's id → `404`, no B identifiers in body |
| Route coverage | Every DRF route is in the isolation suite or on the public allow-list |
| Celery isolation | A task given another user's object id refuses |
| Webhook | Invalid, missing, SHA-1, and tampered-body signatures → `401` |
| Secrets in responses | No serializer output contains a token, secret, or key |
| Secrets in logs | Redaction filter catches a deliberately logged token |
| Session flags | `httpOnly`, `Secure`, `SameSite=Lax` set in production settings |
| CORS | A non-allow-listed origin gets no `Access-Control-Allow-Origin` |
| Throttling | The 6th login attempt within the window is rejected |
| Ordering | `?ordering=password` rejected |
| Pagination | `?pageSize=100000` clamps to 100 |
| Open redirect | `next=https://evil.com` rejected at the OAuth callback |
| Raw SQL | Static check finds no `.raw(`/`.extra(`/`cursor.execute` |
| Production settings | `DEBUG` False, `ALLOWED_HOSTS` non-empty, every secret unset → startup failure |
| Retention | `patch` is null after the retention window; metrics survive |
