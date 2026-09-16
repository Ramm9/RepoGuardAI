# RepoGuard — Webhook Flow

**Status:** Phase 0 deliverable. Implemented in Phase 5.
**Endpoint:** `POST /api/v1/webhooks/github/` — unauthenticated, signature-verified.

This is the most security-sensitive endpoint in the product. It is the one place
where an unauthenticated stranger can cause work to happen.

---

## 1. Why the path is `/webhooks/github/` and not `/github/webhooks/`

The `/github/*` namespace is session-authenticated and outbound (RepoGuard →
GitHub). The webhook ingress is unauthenticated and inbound (GitHub → RepoGuard).
Putting them in the same namespace means one misplaced router registration puts
an authenticated management view behind `AllowAny`, or the ingress behind a login
requirement that silently drops every delivery.

`GET /api/v1/github/webhooks/` (settings panel, authenticated) and
`POST /api/v1/webhooks/github/` (ingress, anonymous) are deliberately
different namespaces so that cannot happen by accident.

---

## 2. The handler does almost nothing

```
GitHub POST /api/v1/webhooks/github/
  │
  ├─ 1. Read raw body (bytes, before any parsing)
  ├─ 2. Verify X-Hub-Signature-256 — HMAC-SHA256, constant-time compare
  │        fail → 401, log, stop.                              [~1 ms]
  ├─ 3. Reject bodies > MAX_WEBHOOK_BODY (default 5 MiB) → 413
  ├─ 4. Parse JSON; read X-GitHub-Event, X-GitHub-Delivery
  ├─ 5. Event in {push, pull_request, installation,
  │              installation_repositories, ping}?
  │        no → 202 {"status":"ignored"}. Do not 400.
  ├─ 6. BEGIN TRANSACTION
  │        INSERT WebhookDelivery (delivery_id UNIQUE)
  │          conflict → 200 {"status":"duplicate"}, stop.
  │        Resolve installation → repository (must be monitored)
  │        Create/return AnalysisJob (partial-unique idempotency key)
  │        Create 7 AnalysisJobStage rows, all `waiting`
  │     COMMIT
  ├─ 7. transaction.on_commit(lambda: task.delay(job_id))
  └─ 8. 202 Accepted {"status":"accepted","jobId":…,"deliveryId":…}

  Target: p99 < 200 ms. GitHub's delivery timeout is 10 s.
```

**No GitHub API call. No file parsing. No model inference.** Everything expensive
happens on a Celery worker. The real reason is not GitHub's timeout — it is that
analysis takes minutes and HTTP requests should not.

### 2.1 Order matters

Signature verification happens **first**, before JSON parsing, before any
database read. An unsigned request must not be able to make us parse 5 MiB of
attacker-controlled JSON or touch the database. Body-size rejection sits between
signature and parse for the same reason.

Deduplication happens **before** the task is enqueued, in the same transaction,
with `on_commit` for the enqueue. Enqueuing before commit is a classic race: the
worker can start, read a row that does not exist yet, and fail. Enqueuing outside
the transaction lets two concurrent duplicate deliveries both spawn tasks before
either commits.

---

## 3. Signature verification

```python
import hashlib, hmac

def verify_signature(raw_body: bytes, header: str | None, secret: str) -> bool:
    if not header or not header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header)
```

Five requirements, each of which is a real failure mode:

1. **`hmac.compare_digest`, never `==`.** String equality short-circuits on the
   first differing byte, which leaks the signature prefix through response timing.
2. **Raw bytes, not the parsed body.** `request.body` before any middleware or
   DRF parser touches it. Re-serializing parsed JSON changes whitespace and key
   order and the HMAC will never match.
3. **Missing header is a failure**, not a skip. A `None` signature must take the
   same 401 path as a wrong one.
4. **No fallback to `X-Hub-Signature`** (SHA-1). It is deprecated and weaker;
   accepting it means an attacker chooses the algorithm.
5. **`GITHUB_WEBHOOK_SECRET` must be set.** In production, a missing secret is a
   startup failure, not a permissive default. A webhook endpoint that accepts
   unsigned requests because the secret was unset is an open job-creation API.

Failed verification returns `401` with `{"detail": "Invalid signature.",
"code": "invalid_signature"}`, logs `event`, `delivery_id`, source IP, and the
*first 8 hex characters* of the presented signature. Never the expected one.

Rate limiting: the ingress is throttled per source IP (`200/min`, well above
GitHub's real delivery rate) so a signature-guessing flood cannot consume
database connections.

---

## 4. Idempotency

GitHub documents that deliveries may repeat. Three layers, outermost first.

| Layer | Key | On repeat |
| --- | --- | --- |
| Delivery | `WebhookDelivery.delivery_id` unique (`X-GitHub-Delivery`) | `200 {"status":"duplicate"}` |
| Job | `AnalysisJob.idempotency_key` unique while `status in (queued, running)` | Return the existing job |
| Record | `Commit (repository, sha)` unique · `PullRequest (repository, number)` unique | Upsert |
| Prediction | `RiskPrediction (commit, model_version, feature_version)` unique | Skip |

The delivery layer alone is not enough: GitHub can send *semantically* duplicate
events with different delivery ids (a push retried by the sender, a PR
`synchronize` firing twice for one force-push). The job and record layers catch
those.

A duplicate returns `200`, not `202` — the distinction is deliberate, so delivery
logs on GitHub's side show plainly which deliveries produced work.

---

## 5. Events handled

### 5.1 `push`

```json
{ "ref": "refs/heads/main", "before": "a1b2…", "after": "f9e8…",
  "commits": [...], "head_commit": {...}, "forced": false,
  "repository": { "id": 123456789, "full_name": "acme/payments-api" },
  "installation": { "id": 4242 } }
```

Handling:

| Condition | Action |
| --- | --- |
| `ref` is not a branch (`refs/tags/…`) | Ignore |
| Branch not tracked for this repository | Ignore |
| `repository.monitoring != "active"` | Ignore, record reason |
| `settings.analyze_every_push == false` | Record delivery, no job |
| `deleted: true` (branch deleted) | Mark branch untracked, no analysis |
| `after == "000000…"` | Branch deletion; same as above |
| `forced: true` | Use `compare(before, after)`; history may have been rewritten |
| ≤ `PUSH_COMMIT_LIMIT` commits (default 20) | One job, one `analyze_commit` per commit |
| > limit | One job; analyze `head_commit` plus the N most recent, and record the truncation in the job's `history` stage detail |

The truncation is reported, not hidden. A 400-commit push from a merged
long-running branch is a real case, and claiming to have analyzed all of it would
be false.

`payload.commits` carries messages and authors but **not** file diffs. The worker
calls `get_commit(sha)` for each — one request, returning files and patches
together.

### 5.2 `pull_request`

Actions acted on: `opened`, `reopened`, `synchronize`, `ready_for_review`,
`edited` (title/body only → metadata update, no re-analysis).
Actions recorded but not analyzed: `closed`, `merged`, `labeled`, `assigned`,
`review_requested`.

`synchronize` means new commits were pushed to the PR branch — a full
re-analysis. `closed` with `merged: true` updates `merged_at` and
`merge_commit_sha`, and **triggers the SZZ defect-labelling pass**
(`ml-labeling-strategy.md`), because a merge is the point at which a change
enters the history that later commits may fix.

Gated on `settings.analyze_pull_requests`.

### 5.3 `installation`

| `action` | Handling |
| --- | --- |
| `created` | Reconcile with the installation stored at OAuth callback |
| `deleted` | `status = "revoked"`, purge tokens, all repositories → `paused` |
| `suspend` | `status = "expired"`, repositories → `paused` |
| `unsuspend` | `status = "active"`, restore previous monitoring state |
| `new_permissions_accepted` | Refresh `permissions` jsonb; recompute `scopes` |

### 5.4 `installation_repositories`

`repositories_added` → become available in discovery (no automatic monitoring;
the user chooses). `repositories_removed` → `monitoring = "error"` with a recorded
reason, so the user sees why data stopped arriving instead of watching a
repository quietly go stale.

### 5.5 `ping`

`202 {"status":"pong"}` after signature verification. GitHub sends this when the
App's webhook is configured; failing it makes the App look broken.

---

## 6. Unknown events

Return `202 {"status":"ignored","event":"<name>"}`. Not `400`.

GitHub adds event types, and a `400` on an unrecognized event makes GitHub mark
the delivery failed and eventually disable the webhook — taking `push` down with
it. Ignoring cleanly is the only safe default, and the delivery is still recorded
with `status = "ignored"` so the set of things we are not handling is visible
rather than invisible.

---

## 7. Repository resolution

```
payload.installation.id  → GitHubInstallation  (unique)
payload.repository.id    → Repository.github_id (within that installation)
```

Resolution is by **GitHub numeric id**, never by `full_name`. A repository rename
changes the name and keeps the id; matching on the name loses the repository on
rename and — worse — could match a *different* repository that later takes the
freed name.

If the installation is unknown: `202 {"status":"ignored"}` plus a warning log. A
valid signature with an unknown installation means our records are behind
GitHub's, not that the request is hostile.

If the repository is unknown or not monitored: `202 {"status":"ignored"}`.
Users are not obliged to monitor every repository the App can see.

**Ownership is established by the installation, not by the payload.** Nothing in
an attacker-supplied body can attach a job to another tenant, because the user is
derived from `installation_id → GitHubInstallation.user`. A payload claiming
`"repository": {"id": <someone else's>}` resolves within *this* installation's
repositories and finds nothing.

---

## 8. Response codes

| Status | Body `status` | When |
| --- | --- | --- |
| `202` | `accepted` | Verified, deduped, job created |
| `202` | `ignored` | Verified, no work needed (untracked branch, unknown event, setting off) |
| `202` | `pong` | `ping` |
| `200` | `duplicate` | Delivery id already seen |
| `401` | — | Signature invalid or missing (`code: invalid_signature`) |
| `413` | — | Body over limit |
| `429` | — | Ingress throttle |
| `500` | — | Genuine server fault; GitHub will retry |

Only `500` invites a GitHub retry, which is correct: everything else is a decision
we have already made and do not want repeated.

---

## 9. Observability

Every delivery writes a `WebhookDelivery` row with `delivery_id`, `event`,
`action`, `signature_valid`, `status`, `payload_digest` (SHA-256), resolved
repository, and the created job.

The raw payload is **not** stored — only its digest. Payloads contain commit
messages and author emails, we have no use for them after processing, and
retaining them indefinitely is a liability we did not need to take on. The digest
is enough to prove two deliveries carried identical content.

Structured log line per delivery:

```
event=webhook.received  delivery_id=…  github_event=push  action=-
  installation_id=4242  repository_id=<uuid>  user_id=<uuid>
  job_id=<uuid>  status=accepted  duration_ms=47
```

Never logged: the secret, the expected signature, the payload body, tokens.

Alerting thresholds worth having: signature-failure rate above baseline (either
a secret rotation went wrong or someone is probing), p99 handler latency above
1 s (we are drifting toward GitHub's timeout), and duplicate rate above ~5%
(GitHub is retrying, which usually means we returned 500 somewhere).

---

## 10. Local development

GitHub cannot reach `localhost`. Two supported routes:

```bash
# Tunnel — real deliveries, real signatures
cloudflared tunnel --url http://localhost:8000
# then set the App's webhook URL to https://<id>.trycloudflare.com/api/v1/webhooks/github/
```

```bash
# Replay — no tunnel, uses a recorded payload shape and signs it correctly
python manage.py replay_webhook --event push --fixture tests/fixtures/github/push.json
```

`replay_webhook` computes a genuine HMAC with the configured secret and POSTs to
the local endpoint, so the signature path is exercised rather than bypassed. There
is **no development flag that skips verification** — a switch like that
eventually ships.

---

## 11. Tests (Phase 13)

| Test | Asserts |
| --- | --- |
| Valid signature | `202`, job created, 7 stage rows |
| Invalid signature | `401`, no job, no delivery side effects |
| Missing signature header | `401` |
| Tampered body, valid-for-original signature | `401` |
| SHA-1 `X-Hub-Signature` only | `401` |
| Duplicate `X-GitHub-Delivery` | `200 duplicate`, exactly one job |
| Concurrent duplicate deliveries | Exactly one job (unique constraint holds under race) |
| Unknown event type | `202 ignored`, not `400` |
| Untracked branch | `202 ignored`, no job |
| `analyze_every_push = false` | Delivery recorded, no job |
| Unknown installation | `202 ignored`, warning logged |
| Cross-tenant repository id in payload | Resolves to nothing, no job |
| Body over size limit | `413` |
| Force push | `compare()` path taken |
| Push with 50 commits | One job, truncation recorded in stage detail |
| Handler latency | No GitHub client call made during the request |

The last row is the one that keeps the design honest: an assertion that the
webhook request made zero outbound HTTP calls. It is the property most likely to
be broken by a well-meaning change, and the hardest to notice without a test.
