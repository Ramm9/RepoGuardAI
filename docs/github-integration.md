# RepoGuard — GitHub Integration

**Status:** Phase 0 deliverable. Implemented in Phase 4.
**Access posture:** read-only. This is a product promise, not just a default.

---

## 1. GitHub App, not OAuth App

| | GitHub App | OAuth App |
| --- | --- | --- |
| Token scope | Per-installation, per-repository | The user's entire account |
| Token lifetime | ~1 hour, re-mintable | Long-lived |
| Revocation | Repository admin, without touching the user's account | User-level only |
| Rate limit | Per installation (5,000/hr, scales with repo count) | 5,000/hr shared per user |
| Webhooks | Built in, one secret, managed by the App | Per-repository hooks to create |
| Blast radius of a leaked token | One hour, read-only, selected repositories | The user's whole GitHub account |

The last row decides it. RepoGuard holds a credential to someone's source code;
the only responsible choice is the one where a database compromise yields one hour
of read access to repositories the user explicitly selected.

### 1.1 Requested permissions — least privilege

| Permission | Level | Why |
| --- | --- | --- |
| `contents` | **read** | Commits, diffs, file contents, branches |
| `metadata` | **read** | Mandatory for all Apps |
| `pull_requests` | **read** | PR list, files, commits |
| `checks` | *not requested* | Only needed to publish check runs — a later phase |
| `issues` | *not requested* | Deferred; used only by optional labelling signals |

Subscribed events: `push`, `pull_request`, `installation`,
`installation_repositories`.

**No write permission is requested.** The onboarding screen
(`components/onboarding/onboarding-aside.tsx`) tells the user, in a list they can
read before granting access:

> Push commits or modify any branch — **not permitted**
> Change repository settings or access — **not permitted**
> Retain your source after analysis — **not permitted**

That third line is a retention commitment, not an access one, and it is honoured
by the `patch` retention job in `database.md` §3.7. The same panel promises
"Post review comments on pull requests" as permitted — **that capability does not
exist yet and the App does not hold the permission for it.** Until PR commenting
is implemented (advanced phase), the `pull_requests: write` permission must not be
requested, and the frontend copy for that row needs to say "planned". Logged as a
frontend copy discrepancy in `api-contract.md` §9 territory — it is a promise the
backend cannot currently keep, and the honest fix is to change the copy, not to
request write access we do not use.

---

## 2. Authentication chain

Three distinct credentials, each with a different lifetime and a different owner.

```
GitHub App private key  (PEM, from env, never rotated by the app)
        │  sign JWT, RS256, exp ≤ 10 min, iss = APP_ID
        ▼
App JWT                 (proves "I am RepoGuard")
        │  POST /app/installations/{id}/access_tokens
        ▼
Installation token      (~1 hour, scoped to selected repositories)
        │  Authorization: Bearer <token>
        ▼
GitHub REST API
```

**None of these ever reaches the browser.** The only GitHub-derived data the
frontend receives is `GitHubConnection` — a boolean, a username, an avatar URL, a
display scope list, a timestamp, and an expiry flag (`api-contract.md` §5.2).

Token handling rules:

- The App JWT is generated per call and never stored.
- The installation token is cached in Redis under
  `github:token:{installation_id}` with a TTL of `expires_at − 5 min`, and
  mirrored encrypted in `GitHubInstallation.token_encrypted` so a Redis flush
  does not force a re-mint storm.
- Encryption is Fernet with `GITHUB_TOKEN_ENCRYPTION_KEY`. The key comes from the
  environment and is never written to the repository or to a log.
- A `401` from GitHub invalidates the cached token and triggers exactly one
  re-mint. A second `401` sets `installation.status = "expired"` and surfaces as
  `GitHubConnection.expired = true`.
- Tokens are excluded from serializers, `__repr__`, Django admin, and the logging
  filter (`security.md` §Logging).

---

## 3. Connection flow

What the frontend does is deliberately minimal — `services/auth.ts` calls it
"navigation", and that is the whole of its role.

```
1.  Browser: GET  {API}/auth/github/start/?next=/onboarding
                       │
2.  Django:  sign state = HMAC(session_key, next, nonce, iat), store nonce in session
             302 → https://github.com/apps/{slug}/installations/new?state=<state>
                       │
3.  User authorizes on github.com, selects repositories
                       │
4.  GitHub:  302 → {API}/auth/github/callback/?installation_id=…&setup_action=…&state=…
                       │
5.  Django:  verify state (HMAC + nonce + iat < 10 min + session match)
             mint installation token
             GET /installation/repositories  → store account metadata
             upsert GitHubInstallation
             302 → {FRONTEND}/onboarding
                       │
6.  Browser: GET {API}/auth/github/  → GitHubConnection { connected: true, … }
```

Why `state` is signed rather than just random: a random nonce in the session
proves the callback belongs to this browser, and the HMAC additionally proves the
`next` parameter was not tampered with. `next` is also validated against an
allow-list of frontend paths — an open redirect on an OAuth callback is a
phishing primitive, and "it's just a redirect" is how that bug ships.

**The install-vs-authorize distinction:** a GitHub App installation is granted by
a repository admin and is not, by itself, a user login. RepoGuard's session is
already established (the user signed in at `/login` before onboarding), so the
callback attaches the installation to `request.user`. If the session is gone by
the time the callback lands, the installation is held against the signed state's
user id and the user is redirected to `/login?next=/onboarding` — never silently
attached to whoever's session happens to be active.

---

## 4. Client layer

All GitHub access goes through one module tree. No view, serializer, or task
calls `requests` against `api.github.com` directly.

```
apps/github/
  client/
    base.py            GitHubClient — auth, retry, rate limit, pagination
    app_auth.py        JWT signing, installation token minting + caching
    repositories.py    list_installation_repositories, get_repository, list_branches
    commits.py         list_commits, get_commit, get_commit_diff, compare
    pull_requests.py   list_pull_requests, get_pull_request, list_pr_files, list_pr_commits
    contents.py        get_file_contents, get_tree
    hooks.py           list_hooks, ping_hook, redeliver
  services/
    installations.py   connect, refresh, disconnect, sync_repositories
    discovery.py       → AvailableRepository[] for onboarding
  webhooks/
    views.py  signature.py  handlers.py  dedupe.py
```

### 4.1 `GitHubClient` responsibilities

One class handles every cross-cutting concern so the resource modules stay thin.

**Retry.** `429`, `502`, `503`, `504`, and connection errors retry with
exponential backoff and jitter, 5 attempts max. `4xx` other than `429` never
retries — a `404` will not become a `200`.

**Rate limiting.** Every response's `X-RateLimit-Remaining` and
`X-RateLimit-Reset` are recorded in Redis per installation. Below a floor of 100
remaining, non-interactive calls (ingestion, backfill) raise
`RateLimitReserved` and the Celery task reschedules itself past `reset`.
Interactive calls (the onboarding repository list) proceed, because making a user
wait for a backfill's quota is the wrong trade. On a genuine `403`/`429` with
`X-RateLimit-Remaining: 0`, the client reads `Retry-After` or `Reset` and raises
`RateLimited(retry_at=…)` — it never busy-waits and never spins.

**Secondary rate limits.** GitHub's abuse detection returns `403` with a
`Retry-After` and no `X-RateLimit` headers. Treated as a hard stop for that
installation for the stated duration, recorded in Redis so parallel workers
respect it too.

**Conditional requests.** `ETag`s from repository-metadata and branch-list calls
are cached in Redis; a `304 Not Modified` costs **zero** rate-limit quota. This is
the cheapest available lever on quota and it is applied to every
cacheable GET.

**Pagination.** `Link: rel="next"` is followed transparently, with a hard page
cap per call site so a repository with 400,000 commits cannot produce an
unbounded loop. Every paginating method takes an explicit `max_items`.

**Timeouts.** `connect=5s`, `read=20s`, always set. A request without a timeout is
a worker that hangs forever.

**Errors** are normalized to a small exception set —
`GitHubNotFound`, `GitHubUnauthorized`, `GitHubForbidden`, `RateLimited`,
`GitHubServerError`, `GitHubUnavailable` — which map to the `code` values in
`api-contract.md` §3.3. Raw upstream JSON never reaches a response body.

### 4.2 Service functions required

Per the brief, the client exposes exactly these operations:

| Function | GitHub endpoint | Used by |
| --- | --- | --- |
| `list_installation_repositories` | `GET /installation/repositories` | Onboarding discovery |
| `get_repository` | `GET /repos/{owner}/{repo}` | Ingestion, metadata refresh |
| `list_branches` | `GET /repos/{o}/{r}/branches` | Onboarding step 3, `BranchRef` |
| `list_commits` | `GET /repos/{o}/{r}/commits` | Initial scan |
| `get_commit` | `GET /repos/{o}/{r}/commits/{sha}` | Push analysis (includes files + patch) |
| `compare_commits` | `GET /repos/{o}/{r}/compare/{base}...{head}` | Multi-commit push, force-push |
| `list_pull_requests` | `GET /repos/{o}/{r}/pulls` | PR ingestion |
| `get_pull_request` | `GET /repos/{o}/{r}/pulls/{n}` | PR analysis |
| `list_pull_request_files` | `GET /repos/{o}/{r}/pulls/{n}/files` | `PullRequestFile` |
| `list_pull_request_commits` | `GET /repos/{o}/{r}/pulls/{n}/commits` | PR-level features |
| `get_file_contents` | `GET /repos/{o}/{r}/contents/{path}` | AST analysis |
| `get_languages` | `GET /repos/{o}/{r}/languages` | `Repository.language` |
| `get_contributors` | `GET /repos/{o}/{r}/contributors` | `contributorCount` |
| `list_hooks` / `redeliver` | `GET/POST /repos/{o}/{r}/hooks…` | Settings webhook panel |

---

## 5. Repository discovery and selection

`GET /api/v1/github/repositories/?search=` returns a **bare array** of
`AvailableRepository` (`api-contract.md` §3.2 — this is observed behaviour, not a
choice).

Implementation notes:

- Sourced from `GET /installation/repositories`, paginated, cached in Redis for
  5 minutes per installation. The frontend hook already sets
  `staleTime: 5 * 60_000` and disables refetch-on-focus, so the two windows agree.
- `search` filters **server-side** on full name, language, and description. The
  frontend passes the term through and does not filter.
- `id` is RepoGuard's own opaque string and must round-trip into
  `POST /analysis/jobs/` and `/github/repositories/{id}/branches/`. Format:
  `gh_{github_id}` for not-yet-connected repositories, the `Repository.id` UUID
  once connected — resolved by a single lookup helper so both forms work.
- `monitoring` is `pending` for unconnected repositories and the real state for
  connected ones, so the picker can show what is already under monitoring.

Selecting a repository (`POST /analysis/jobs/`) does five things in one
transaction, then enqueues:

1. Upsert `Repository` rows for the selected ids.
2. Set `baseline_branch` (the request's `branch` for the primary; each other
   repository's own default).
3. Set `monitoring = "pending"`, `monitored_since = now()`.
4. Create the `AnalysisJob` plus its seven `AnalysisJobStage` rows, all `waiting`.
5. Register/verify the webhook.

Then `initial_scan.delay(job_id)`.

---

## 6. Webhook registration

A GitHub App receives events for all its installed repositories at the **App-level
webhook URL** configured in the App settings — there is no per-repository hook to
create. `GitHubWebhook` rows therefore describe delivery health for the settings
panel rather than hooks RepoGuard created.

One App-level secret (`GITHUB_WEBHOOK_SECRET`) signs every delivery. The
per-repository `webhook_secret_encrypted` column exists only for the fallback path
where a repository is monitored through a legacy OAuth-style hook; it is unused in
the App flow and stays null.

Delivery health shown in settings comes from the `WebhookDelivery` table (ours),
not from polling GitHub — cheaper, and it reflects what we actually received
rather than what GitHub believes it sent.

---

## 7. Disconnection and revocation

Three paths, all of which must leave the system consistent:

**User disconnects in RepoGuard** (`DELETE /auth/github/`):
set `installation.status = "revoked"`, purge cached tokens, set every repository
to `monitoring = "paused"`, delete `token_encrypted`. Analysis history is kept —
a reconnect should not lose a year of measurements (`database.md` §2 soft delete).

**User uninstalls the App on GitHub:** the `installation` webhook with
`action: "deleted"` arrives. Same handling, driven by the event.

**Repository access removed** (`installation_repositories` with
`repositories_removed`): those repositories go to `monitoring = "error"` with a
recorded reason. The user sees the state; nothing silently keeps trying.

**Token rejected mid-analysis:** the task marks the job `failed` with
`error_code = "github_token_expired"`, sets `installation.status = "expired"`, and
the next `GET /auth/github/` returns `expired: true`. The frontend's
`requiresReauth` path (`lib/api/client.ts`) then renders the reconnect UI. The
important part: **no synthetic result is written**. A job that could not read the
repository has no metrics, and it says so.

---

## 8. Quota budget

An installation gets 5,000 requests/hour (more with many repositories). Rough
cost of the operations we perform:

| Operation | Requests | Notes |
| --- | --- | --- |
| Initial scan, 90-day window, ~500 commits | ~520 | 1 repo + 1 branches + ~5 commit pages + 500 commit details + 1 languages + 1 contributors |
| Push event, 1 commit | 1 | `get_commit` returns files **and** patches |
| Push event, N commits | N + 1 | One `compare`, then details per commit |
| PR opened/updated | 3 | PR + files + commits |
| Metadata refresh (cached, ETag) | 0–1 | `304` costs nothing |

An initial scan is the only expensive operation, and it is bounded by
`history_depth_days` (default 90) and a hard commit cap (default 1,000). That cap
is a product decision with a visible consequence — a repository with more history
gets a shallower baseline — and it is reported in the job's `history` stage detail
("1,000 of 6,412 commits") rather than presented as a complete read. Unbounded
historical analysis is explicitly out of scope per the brief's Phase 7, and
silently truncating it would be worse than bounding it openly.

---

## 9. Testing

No test in the suite talks to github.com.

- `responses`/`respx` fixtures replay recorded payload shapes stored under
  `tests/fixtures/github/` — real *shapes*, synthetic *content*.
- Signature verification is tested with computed HMACs, including a
  tampered-body case and a wrong-secret case.
- Rate limiting is tested by asserting the client *reschedules* rather than
  sleeping, so the test does not take an hour.
- Token expiry is tested by returning `401` once (expect one re-mint, success)
  and twice (expect `installation.status = "expired"`).
- Pagination is tested against a 3-page `Link` header chain and against a
  `max_items` cap being respected.
