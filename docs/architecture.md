# RepoGuard — Backend Architecture

**Status:** Phase 0 deliverable.
**Companion documents:** `api-contract.md` (what the frontend requires),
`database.md` (how it is stored), `analysis-pipeline.md` (how it is computed).

---

## 1. What the system is

RepoGuard watches GitHub repositories and answers one question about every
change that lands in them:

> How likely is this change to introduce a defect or regression?

The answer is **probabilistic and explained**, never deterministic. The product
vocabulary is fixed accordingly: *risk score*, *predicted defect probability*,
*regression risk*, *model confidence*, *risk factors*. Nothing in this system
says "this commit has a bug."

The end-to-end path:

```
GitHub event  →  webhook (validate, dedupe, enqueue, return in <200ms)
              →  Celery task
              →  ingestion (fetch commit, files, diff via installation token)
              →  metrics (churn, complexity, history, coverage signals)
              →  feature engineering (versioned feature vector)
              →  ML inference (risk probability + confidence)
              →  explanation (ranked risk factors)
              →  PostgreSQL
              →  DRF API
              →  existing Next.js frontend
```

---

## 2. Shape: modular monolith

One Django project, many small apps with enforced boundaries. Not microservices.

The reasoning is not "microservices are bad" — it is that this system has one
database, one consistency domain, one deploy cadence, and one team. Splitting it
across process boundaries would buy independent scaling we do not need and cost
us distributed transactions we would have to hand-roll. The one component that
genuinely needs independent scaling — analysis work — is already separated as
Celery workers, which is the correct seam and the only one the workload actually
demands.

What we keep from the microservice discipline: apps own their models, cross-app
access goes through service functions rather than reaching into another app's
ORM, and no app imports another's internals.

```
backend/
  manage.py
  config/
    settings/            base.py · local.py · production.py · test.py
    urls.py  celery.py  asgi.py  wsgi.py

  apps/
    users/               accounts, auth, profile, settings
    github/              App auth, REST client, webhooks ingress
    repositories/        Repository, Branch, health snapshots
    commits/             Commit, CommitFile, ingestion
    pull_requests/       PullRequest, PullRequestFile
    analysis/            AnalysisJob orchestration, Celery tasks
    metrics/             code/test/dependency metric extraction
    risk/                RiskPrediction, factors, hotspots, recommendations
    ml_engine/           features, training, inference, model registry
    analytics/           aggregation, snapshots, time series
    alerts/              rules engine, alert lifecycle

  common/
    permissions/  pagination/  exceptions/  serializers/  utils/  logging/

  tests/
```

---

## 3. Layers

The rule: **each layer may call the one below it and never the one above.**

```
┌───────────────────────────────────────────────────────┐
│ HTTP            views, serializers, permissions       │  apps/*/api/
│                 — no business logic, no GitHub calls  │
├───────────────────────────────────────────────────────┤
│ Application     use-case services; transactions;      │  apps/*/services/
│                 orchestration; enqueues Celery tasks  │
├───────────────────────────────────────────────────────┤
│ Domain          pure analysis logic. No Django ORM,   │  apps/metrics/analyzers/
│                 no network, no I/O. Trivially tested. │  apps/risk/scoring/
├───────────────────────────────────────────────────────┤
│ Infrastructure  ORM models, GitHub client, Redis,     │  apps/*/models.py
│                 object storage                        │  apps/github/client/
├───────────────────────────────────────────────────────┤
│ Async           Celery tasks — thin wrappers that     │  apps/*/tasks.py
│                 call application services             │
├───────────────────────────────────────────────────────┤
│ ML              feature pipeline, inference, registry │  apps/ml_engine/
└───────────────────────────────────────────────────────┘
```

Four rules that follow, and that code review enforces:

1. **A view never calls GitHub.** It calls a service; the service calls the
   GitHub client. Scattering `requests.get("https://api.github.com/...")` through
   views is how rate limiting, retry, and token refresh become unfixable.
2. **A serializer never computes.** `RepositorySerializer` reads `health` off the
   row. It does not calculate it. Business logic in serializers is invisible to
   tests that do not go through HTTP.
3. **A Celery task is a thin wrapper.** `analyze_commit(commit_id)` loads, calls
   `CommitAnalysisService.run(commit)`, and handles retry. The logic lives in the
   service so it can be tested without a broker.
4. **The domain layer imports nothing from Django.** `CyclomaticComplexity`,
   `ChurnCalculator`, and the risk-factor ranker take plain data in and return
   plain data out. They are the parts most worth unit-testing and the parts that
   are hardest to test if they touch the ORM.

---

## 4. Request paths

### 4.1 A read (dashboard)

```
Browser ─GET /api/v1/dashboard/summary/─▶ Django
                                          │ session cookie → user
                                          │ queryset filtered by user
                                          │ read denormalized snapshot rows
                                          ▼
                                       200 camelCase JSON
```

Synchronous, indexed, no GitHub call, no computation. Every number the dashboard
shows was computed by a background job and stored. **No API read ever triggers
analysis** — that is what makes the read path fast and what keeps a page load
from depending on GitHub's availability.

### 4.2 A write that means work (push webhook)

```
GitHub ─POST /api/v1/webhooks/github/─▶ Django
                                        │ 1. HMAC-SHA256 verify (constant time)
                                        │ 2. dedupe on X-GitHub-Delivery
                                        │ 3. resolve installation → repository
                                        │ 4. persist WebhookDelivery + AnalysisJob
                                        │ 5. enqueue Celery task
                                        ▼
                                     202 Accepted        ← target: < 200 ms
                                        │
                              Redis ────┤
                                        ▼
                                   Celery worker
                                        │ fetch → metrics → features
                                        │ → inference → explanation
                                        │ → persist → refresh snapshots
                                        │ → evaluate alert rules
                                        ▼
                                   PostgreSQL
```

The webhook handler does no analysis. GitHub's delivery timeout is 10 seconds and
a slow endpoint gets deliveries dropped — but the real reason is simpler: the
work takes minutes and HTTP requests should not.

---

## 5. Component responsibilities

| App | Owns | Explicitly does not |
| --- | --- | --- |
| `users` | User, auth, profile, analysis/notification settings | Know anything about GitHub |
| `github` | App JWT, installation tokens, REST client, rate limiting, webhook ingress | Contain analysis logic |
| `repositories` | Repository, Branch, health snapshots, monitoring lifecycle | Call GitHub directly (uses `github` services) |
| `commits` | Commit, CommitFile, commit ingestion | Score risk |
| `pull_requests` | PullRequest, PullRequestFile | Score risk |
| `analysis` | AnalysisJob lifecycle, stage progress, orchestration | Implement metrics or ML |
| `metrics` | AST analysis, churn, complexity, coverage ingestion, dependency diffing | Know about ML features |
| `risk` | RiskPrediction, RiskFactor, Recommendation, Hotspot | Train models |
| `ml_engine` | Feature pipeline, training, evaluation, registry, inference | Touch HTTP or views |
| `analytics` | Daily aggregation, time series, team rollups | Recompute from raw data on read |
| `alerts` | Rule evaluation, alert lifecycle, notification dispatch | Decide what "risky" means (asks `risk`) |

---

## 6. Key decisions and why

**Modular monolith over microservices.** One consistency domain, one team. The
only workload needing independent scale is analysis, and Celery already provides
that seam. Revisit when a component has a genuinely different scaling profile,
not before.

**Cookie sessions over JWT.** Not actually a decision — `lib/api/client.ts` sends
`credentials: "include"` and no `Authorization` header, so the frontend already
chose. It is also the better choice: an httpOnly cookie is not readable by
injected script, whereas a token in `localStorage` is. See `security.md` §CSRF for
the cost this incurs.

**GitHub App over OAuth App.** Installation tokens are scoped per-repository,
expire in an hour, and are revocable by a repository admin without touching the
user's account. An OAuth token carries the user's full account scope and long
life. For read-only monitoring, the App is strictly less dangerous to hold.

**Denormalized rollups over on-read computation.** `Repository` carries eleven
derived numbers. Computing them per row per request would make the repository
list a table scan over every commit. They are written by the analysis pipeline
and refreshed on a schedule; the read path stays indexed.

**Raw metrics stored separately from predictions.** `CodeMetric` rows are facts
about a commit; `RiskPrediction` rows are a model's opinion of them. Keeping them
apart means retraining and re-scoring never destroys the measurements, and the
same metrics can be re-scored by a new model version for comparison.

**Versioned features and models on every prediction.** Every `RiskPrediction`
records `feature_version` and `model_version`. Without this, a model upgrade
silently makes historical predictions uninterpretable and evaluation impossible.

**Analysis progress modelled as rows, not computed.** The seven stages are
persisted per job and updated as work completes, so `GET /analysis/jobs/{id}/` is
a single indexed read. The frontend polls this endpoint; it must stay trivial.

**Synchronous inference, asynchronous everything else.** Scoring a feature vector
with a tree model is sub-millisecond. The expensive parts are fetching from
GitHub and parsing code. So the model loads once per worker process and scores
inline — no model-server hop, no extra failure mode.

---

## 7. Failure posture

| Failure | Behaviour |
| --- | --- |
| GitHub API down | Task retries with exponential backoff; job stays `running`; after max retries → `failed` with reason |
| GitHub rate limit | Client reads `X-RateLimit-Reset`, reschedules past the window; never busy-waits |
| Installation token revoked | `GitHubConnection.expired = true`; repository → `monitoring: "error"`; frontend shows reconnect via `requiresReauth` |
| Redis down | Webhooks still return 202 and persist the job row; work resumes when the broker returns (jobs are durable in PostgreSQL, not only in the queue) |
| Model file missing | Inference raises at worker start, not per-request; job fails with a clear reason rather than emitting a fabricated score |
| Unparseable source file | That file's AST metrics are `null`; the commit is still analyzed on the metrics that succeeded, and the null propagates honestly |
| Duplicate webhook delivery | Deduped on `X-GitHub-Delivery`; returns 200 with no new work |

The through-line: **a missing signal is `null`, never a substituted default.** A
fabricated zero is indistinguishable from a real zero, and the model cannot learn
around the difference.

---

## 8. Scaling path

Not built now; the architecture must not preclude it.

1. **Now** — one web process, one worker, one PostgreSQL, one Redis.
2. **More repositories** — add workers. Routing queues already exist
   (`webhooks` · `ingestion` · `analysis` · `ml` · `periodic`) so a slow
   full-history scan cannot starve live push analysis.
3. **More reads** — PostgreSQL read replica for analytics; Redis caches for
   repository metadata and computed analytics windows.
4. **More history** — partition `commits` and `code_metrics` by month.
5. **Heavier models** — move inference to a dedicated queue with GPU workers.
   The service boundary is already there; only the queue name changes.

---

## 9. What this architecture deliberately does not include

- **WebSockets.** The frontend polls `GET /analysis/jobs/{id}/`. Adding a realtime
  channel means adding an ASGI deployment and a second delivery path for the same
  data before anything asks for it. Listed as advanced in the brief; left there.
- **A separate model-serving service.** See §6.
- **Multi-language AST analysis at launch.** Python first, behind a
  `LanguageAnalyzer` interface so adding TypeScript is a new class, not a
  refactor.
- **GitHub write access.** The App requests read-only permissions. PR comment
  posting is a later phase and a separate permission grant — and until it exists,
  the product says "read-only repository monitoring" and means it.
