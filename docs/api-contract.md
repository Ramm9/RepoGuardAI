# RepoGuard — Backend API Contract

**Status:** Phase 0 deliverable. Derived from the existing frontend, not proposed to it.
**Audience:** whoever implements the Django/DRF layer, and whoever later changes the frontend.

---

## 0. How this document was produced

Every statement below is traceable to a file in this repository. The frontend was
built first and is the source of truth; this document reports what it already
requires rather than what a backend would prefer to give it.

The authoritative files are:

| File | What it fixes |
| --- | --- |
| `lib/api/client.ts` | Transport, credential mode, error parsing, empty-body handling |
| `lib/api/config.ts` | Base URL, cache directives |
| `lib/api/errors.ts` | `ApiError` surface, field-error mapping, transient-retry rule |
| `lib/api/query-keys.ts` | Which resources are cached and at what granularity |
| `services/auth.ts` | Auth + GitHub-connection endpoints, verbatim |
| `services/onboarding.ts` | Repository discovery + analysis-job endpoints, verbatim |
| `lib/analysis/pipeline.ts` | Job status enum, stage ids, stage labels, job payload |
| `types/*.ts` | Every response body, field by field |
| `lib/mock/*.ts` | Value ranges and the health-score weighting |

Where the frontend does not yet call an endpoint, this document marks it
**PROJECTED** and names the type that fixes its shape. A projected endpoint is a
design commitment, not an observed one, and may be revised when the consuming
screen is built. Endpoints marked **OBSERVED** are already called by committed
frontend code and must not change shape.

---

## 1. Transport invariants

These are not negotiable without a frontend change.

### 1.1 Base URL

```
http://localhost:8000/api/v1
```

`lib/api/config.ts:API_BASE_URL` — `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"`.

Every path in this document is relative to that. Django must mount its router at
`/api/v1/`, **not** `/api/`. All paths carry a **trailing slash** (`APPEND_SLASH`
behaviour is not relied on — the frontend already sends the slash).

### 1.2 Authentication: cookie session, not a bearer token

`apiRequest` sends `credentials: "include"` and sets exactly two headers —
`Accept: application/json`, and `Content-Type` when there is a body. **There is no
`Authorization` header anywhere in the client.** The comment in `services/auth.ts`
states the intent directly: "Sign-in returns a RepoGuard session cookie set by
Django (httpOnly, SameSite=Lax)".

Consequences for Django:

- `SESSION_COOKIE_HTTPONLY = True`, `SESSION_COOKIE_SAMESITE = "Lax"`,
  `SESSION_COOKIE_SECURE = True` outside local development.
- `CORS_ALLOW_CREDENTIALS = True` and an **explicit** `CORS_ALLOWED_ORIGINS` list.
  A wildcard origin is invalid with credentialed requests and the browser will
  reject the response.
- CSRF: DRF's `SessionAuthentication` enforces CSRF on unsafe methods. The client
  sends no `X-CSRFToken` header. Resolution is in §7.3.

### 1.3 Case convention

| Direction | Convention | Evidence |
| --- | --- | --- |
| Request bodies | `snake_case` | `services/onboarding.ts` posts `{ repository_ids, branch }` |
| Response bodies | `camelCase` | every field in `types/*.ts`: `fullName`, `riskScore`, `lastCommitAt`, `healthTrend` |

Implement with `djangorestframework-camel-case`:

```python
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["djangorestframework_camel_case.render.CamelCaseJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["djangorestframework_camel_case.parser.CamelCaseJSONParser"],
}
```

The parser's `underscoreize` is idempotent on already-snake_case keys, so
`repository_ids` passes through unchanged and a future camelCase caller also
works. Two traps:

1. **The renderer camelizes keys, never values.** `HealthComponent.key` is a
   *value* of `"codeQuality" | "testing" | "stability" | "security" |
   "reliability"`. The serializer must emit the literal string `"codeQuality"`;
   storing `code_quality` and relying on the renderer will silently produce the
   wrong value. Same for `stages[].id` and `AlertSource.type` (`pull_request`
   stays snake_case — it is a value).
2. **Error bodies are camelized too.** A 400 on `repository_ids` surfaces to the
   client as the field key `repositoryIds`. See §3.3.

### 1.4 Empty responses

`apiRequest` returns `undefined` for HTTP 204 **or** any response with
`content-length: 0`. `signOut()` is typed `Promise<void>` against
`POST /auth/logout/`. Returning `204 No Content` there is correct and expected.

### 1.5 Caching directives the frontend already sets

From `lib/api/config.ts:REQUESTS`:

| Preset | Fetch option | Intended for |
| --- | --- | --- |
| `live` | `cache: "no-store"` | GitHub-derived resources (repositories, commits, PRs) |
| `immutable` | `cache: "force-cache"` | Completed analyses keyed by commit/PR id |
| `aggregate` | `next.revalidate: 30` | Dashboard and analytics rollups |

The backend should set `Cache-Control: no-store` on live resources and
`Cache-Control: private, max-age=31536000, immutable` on completed
`/commits/{id}/analysis/` and `/pull-requests/{id}/analysis/` responses —
a completed analysis is immutable by definition (it is keyed by model version).

---

## 2. Enumerations — exact values

All enum values are **lowercase**. Any uppercase value (`HIGH`, `COMPLETED`,
`ACTIVE`) will fail to match and will render as an unstyled fallback.

```
RiskLevel          low | medium | high | critical            types/common.ts
TrendDirection     up | down | flat                          types/common.ts
TrendSentiment     positive | negative | neutral             types/common.ts
MonitoringState    active | paused | error | pending         types/common.ts
TimeRange          7d | 30d | 90d | 6m | 1y                  types/common.ts
AnalysisStageState complete | running | waiting              types/common.ts
AnalysisJobStatus  queued | running | complete | failed      lib/analysis/pipeline.ts
PullRequestState   open | merged | closed | draft            types/pull-request.ts
AlertSeverity      critical | high | medium | low            types/risk.ts
AlertStatus        open | read | resolved                    types/risk.ts
AlertSource.type   commit | pull_request | file | repository types/risk.ts
Visibility         public | private | internal               types/repository.ts
Complexity         low | medium | high                       types/risk.ts
Churn              low | medium | high                       types/commit.ts
InsightSeverity    info | positive | warning | critical      types/repository.ts
TeamRole           owner | maintainer | member | viewer       types/analytics.ts
ActivityKind       commit | pull_request | hotspot | health | alert | analysis
HealthComponentKey codeQuality | testing | stability | security | reliability
```

**Two values deserve a callout because the obvious guess is wrong:**

- `AnalysisJobStatus` terminal-success is **`"complete"`**, not `"completed"`.
  `lib/mock/analysis.ts` emits `status: complete ? "complete" : "running"` and
  `components/onboarding/analysis-step.tsx` branches on it.
- `AnalysisStageState` and `AnalysisJobStatus` share the token `"complete"` but
  are different enums. A stage is `complete|running|waiting`; a job is
  `queued|running|complete|failed`. A job has `failed`; a stage does not.

---

## 3. Response envelopes

### 3.1 Paginated lists

```ts
interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
```

This is DRF's stock `PageNumberPagination`. Use it unchanged.

Query parameters, from `types/common.ts:ListParams`:

| Param | Type | Notes |
| --- | --- | --- |
| `page` | number | 1-indexed |
| `pageSize` | number | **Declared camelCase in `ListParams`** |
| `search` | string | Free text |
| `ordering` | string | DRF convention, `-` prefix for descending |

`buildUrl` serializes the params object verbatim into the query string, so a
service passing `{ pageSize: 25 }` produces `?pageSize=25`. Configure pagination
to accept **both** spellings and treat `page_size` as canonical:

```python
class DefaultPagination(PageNumberPagination):
    page_size = 25
    max_page_size = 100
    page_size_query_param = "page_size"

    def get_page_size(self, request):
        if "pageSize" in request.query_params and "page_size" not in request.query_params:
            request.query_params._mutable = True
            request.query_params["page_size"] = request.query_params["pageSize"]
        return super().get_page_size(request)
```

Array-valued params are joined with commas by `buildUrl`
(`url.searchParams.set(key, value.join(","))`), so multi-select filters arrive as
`?riskLevel=high,critical` — **not** repeated keys. Filters must split on commas.

### 3.2 Bare arrays — two endpoints only

Two endpoints return a **bare JSON array**, not a `Paginated<T>` envelope. This is
observed, not projected:

```ts
api.get<AvailableRepository[]>("/github/repositories/", { params: { search } })
api.get<string[]>(`/github/repositories/${repositoryId}/branches/`)
```

Wrapping either in `{count, next, previous, results}` breaks onboarding at the
repository-picker step. Set `pagination_class = None` on both views.

All *projected* list endpoints use `Paginated<T>` unless stated otherwise in §5.

### 3.3 Errors — flat, not nested

`parseErrorResponse` in `lib/api/client.ts` reads **top-level** keys:

```
body.detail   → message   (string)
body.message  → message   (string, fallback if no `detail`)
body.code     → code      (string)
every other top-level key whose value is a string or string[] → fieldErrors[key]
```

The canonical error body is therefore:

```json
{
  "detail": "Your GitHub connection has expired.",
  "code": "github_token_expired"
}
```

and a validation failure is:

```json
{
  "detail": "Validation failed.",
  "code": "validation_error",
  "email": ["An account already uses that email address."],
  "password": ["This password is too common."]
}
```

> **Conflict with the generic spec.** The original brief proposes
> `{"error": {"code": ..., "message": ..., "details": ...}}`. That shape would be
> parsed as: no `detail` → falls back to `messageForStatus(status)` generic copy;
> no `code` → falls back to `http_500`; and the nested `error` object is not a
> string or array so it is **not** collected as a field error either. The result
> is a silently generic error banner for every backend failure. **Resolved in the
> frontend's favour:** errors are flat. `code` is still a stable machine-readable
> string, which was the actual requirement.

`code` values must be **lowercase snake_case**, because two of them are compared
literally:

```ts
const requiresReauth =
  response.status === 401 ||
  code === "github_token_expired" ||
  code === "github_unauthorized";
```

Emitting `GITHUB_CONNECTION_EXPIRED` means `requiresReauth` stays false and the
reconnect UI never appears.

**Reserved error codes** (backend must use exactly these spellings):

| Code | Status | Meaning |
| --- | --- | --- |
| `invalid_credentials` | 401 | Email/password mismatch. Observed in `services/auth.ts`. |
| `email_taken` | 400 | Registration conflict. Observed, with a matching `email` field error. |
| `validation_error` | 400 | Generic serializer failure; field keys carry detail. |
| `github_not_connected` | 409 | Action needs a GitHub installation that does not exist. |
| `github_token_expired` | 401 | Installation credential rejected by GitHub. **Triggers reauth UI.** |
| `github_unauthorized` | 403 | Installation lacks access to the requested resource. **Triggers reauth UI.** |
| `github_rate_limited` | 429 | Upstream GitHub rate limit; include `Retry-After`. |
| `repository_not_monitored` | 409 | Repository exists but monitoring is not active. |
| `analysis_in_progress` | 409 | A job for this scope is already queued or running. |
| `not_found` | 404 | Includes "exists but you don't own it" — see §7.2. |
| `permission_denied` | 403 | Authenticated but not permitted. |
| `throttled` | 429 | Application-level rate limit. |

`ApiError.isTransient` is `status === 0 || status === 429 || status >= 500`, so
those are the only statuses the frontend will consider retrying. Do not return
`500` for a condition the user can fix.

---

## 4. The analysis job contract — fixed, verbatim

`lib/analysis/pipeline.ts` defines this and three consumers agree on it. It is
the single most rigid contract in the product.

```ts
interface AnalysisJob {
  id: string;
  repositoryIds: string[];
  status: "queued" | "running" | "complete" | "failed";
  progress: number;        // 0–100 integer
  stages: AnalysisStage[]; // exactly the seven below, in order
  result?: AnalysisJobResult; // present only when status === "complete"
  startedAt: string;       // ISO 8601
}

interface AnalysisStage { id: string; label: string; state: "complete"|"running"|"waiting"; detail?: string }

interface AnalysisJobResult {
  repositoryId: string;
  health: RepositoryHealth;
  insightCount: number;
  fileCount: number;
  commitCount: number;
}
```

### 4.1 The seven stages — ids and labels are literals

| # | `id` | `label` | Example `detail` |
| --- | --- | --- | --- |
| 1 | `connect` | `Connected to GitHub` | `installation verified` |
| 2 | `fetch` | `Fetched repository` | `337 files` |
| 3 | `history` | `Read commit history` | `3,635 commits` |
| 4 | `metrics` | `Calculated code metrics` | `42 modules` |
| 5 | `profile` | `Building reliability profile` | `118 dependencies` |
| 6 | `model` | `Running ML model` | `42 modules scored` |
| 7 | `insights` | `Generating insights` | `12 findings` |

Rules the backend must honour, because the stepper assumes them:

- **All seven stages are always present**, in this order, from the first poll.
  A job at `progress: 0` returns seven stages all `waiting` (or the first
  `running`). Omitting future stages breaks the step indicator's layout.
- **At most one stage is `running`** at any instant. `stageStatesAt` guarantees
  this and the UI renders a single active spinner.
- **`detail` is only set on stages that are `complete` or `running`.** The
  comment in `pipeline.ts` is explicit: "A '1,284 commits' label beside a stage
  that has not started yet is a claim the run has not yet earned." A `waiting`
  stage must have `detail` absent or `null`.
- **`progress` is monotonic** and reaches exactly `100` when `status` becomes
  `complete`.
- **`result` is absent unless `status === "complete"`.** It is optional in the
  type; emitting a partial result early will render a completion screen over a
  running job.
- **A `failed` job keeps its stages** so the user can see where it stopped. The
  failing stage stays `running` or is marked `complete`; the rest stay `waiting`.
  Carry the reason in a top-level `error` string — **PROJECTED**, not yet read by
  the frontend, so it is additive and safe.

### 4.2 Progress mapping

The mock derives progress from elapsed time against nominal stage durations. The
real backend must derive it from **work actually completed**. The nominal weights
are a reasonable starting split and are what the UI was tuned against:

| Stage | Nominal ms | Cumulative % |
| --- | --- | --- |
| `connect` | 700 | 8 |
| `fetch` | 900 | 19 |
| `history` | 1400 | 35 |
| `metrics` | 1600 | 53 |
| `profile` | 1200 | 67 |
| `model` | 1800 | 88 |
| `insights` | 900 | 100 |

Total nominal runtime 8,500 ms. Real initial scans will take far longer; the UI
does not care, because it renders the reported cursor rather than running its own
clock. That property must be preserved — never report a synthetic percentage that
advances without work behind it.

---

## 5. Endpoint map by screen

Legend: **O** = observed (frontend already calls it) · **P** = projected.

### 5.1 Authentication — `/login`, `/signup`

| | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| **O** | POST | `/auth/register/` | `{name, email, password}` | `Session` |
| **O** | POST | `/auth/login/` | `{email, password, remember}` | `Session` |
| **O** | POST | `/auth/logout/` | — | `204` |
| **P** | GET | `/auth/me/` | — | `Session` |
| **P** | PATCH | `/auth/me/` | `{name?, email?, avatar_url?}` | `User` |
| **P** | POST | `/auth/password/` | `{current_password, new_password}` | `204` |

```ts
interface Session { user: User; github: GitHubConnection }
```

`Session` is defined in `services/auth.ts` and returned by **both** register and
login. A registration response carries a disconnected `github` block
(`connected:false, username:null, scopes:[], connectedAt:null, expired:false`) —
not `null`, not omitted.

`remember` (boolean) controls session lifetime: `False` →
`request.session.set_expiry(0)` (browser session); `True` → a long expiry
(30 days is the reference value).

Auth requirement: `register`, `login` — `AllowAny` + throttled. Everything else —
`IsAuthenticated`.

Error states the forms already handle: `401 invalid_credentials`,
`400 email_taken` (with an `email` field error so the input is marked), generic
400 with field errors mapped via `applyFieldErrors`.

### 5.2 GitHub connection — onboarding step 1, settings

| | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| **O** | GET | `/auth/github/start/?next=<path>` | — | `302` to GitHub |
| **O** | GET | `/auth/github/` | — | `GitHubConnection` |
| **P** | GET | `/auth/github/callback/?code=&state=&installation_id=` | — | `302` back to `next` |
| **P** | DELETE | `/auth/github/` | — | `204` |

`githubAuthorizeUrl()` builds `${API_BASE_URL}/auth/github/start/?next=/onboarding`
and the browser navigates there. This is a **backend** route by design — Django
owns the client id, signs the `state`, exchanges the code, and stores the
installation token. No GitHub credential is ever serialized into a response.

`GitHubConnection` is the entire public surface of a GitHub credential:

```ts
{ connected: boolean; username: string | null; avatarUrl: string | null;
  scopes: string[]; connectedAt: string | null; expired: boolean }
```

`scopes` is a display list of granted permissions, e.g.
`["contents:read", "metadata:read", "pull_requests:read"]` (from
`lib/mock/account.ts`). `expired: true` is how a revoked or rejected credential
reaches the UI without a failing request.

### 5.3 Repository discovery — onboarding steps 2 and 3

| | Method | Path | Response |
| --- | --- | --- | --- |
| **O** | GET | `/github/repositories/?search=<term>` | `AvailableRepository[]` **(bare array)** |
| **O** | GET | `/github/repositories/{id}/branches/` | `string[]` **(bare array)** |

`search` matches against full name, language, and description — that is what the
mock filters on, and the input is labelled as a general search. Server-side
filtering is required; the frontend passes the term through and does not filter
the response.

`AvailableRepository.id` is a **RepoGuard-side opaque string**, and it is the
same id later passed to `POST /analysis/jobs/` as `repository_ids[]` and used in
the branches path. It must round-trip. The mock uses `repo_<name>`; production
should use the GitHub numeric repository id prefixed (`gh_123456789`) or a UUID —
what matters is that it is stable and that `{id}` in the branches path resolves.

`monitoring` on an `AvailableRepository` is `pending` for anything not yet
connected, and `active`/`paused`/`error` for one already under monitoring, so the
picker can show what is already connected.

### 5.4 Analysis jobs — onboarding step 4, dashboard pipeline card

| | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| **O** | POST | `/analysis/jobs/` | `{repository_ids: string[], branch: string}` | `AnalysisJob` |
| **O** | GET | `/analysis/jobs/{id}/` | — | `AnalysisJob` |
| **P** | GET | `/analysis/jobs/?status=running` | — | `Paginated<AnalysisJob>` |
| **P** | POST | `/analysis/jobs/{id}/cancel/` | — | `AnalysisJob` |

`POST` must return **immediately** with `status: "queued"` and all seven stages
`waiting` — the Celery task does the work. `branch` applies to the *primary*
repository (the first id); every other repository baselines on its own default
branch. That is documented in `services/onboarding.ts` and is deliberate product
behaviour, not an oversight.

Polling: the frontend polls `GET /analysis/jobs/{id}/` on an interval. This
endpoint must be cheap — a single indexed row read plus its stage rows. Do not
recompute anything on read.

Idempotency: a second `POST` with the same `repository_ids` + `branch` while a
job is still `queued`/`running` must return the **existing** job (200), not create
a second one. See §8.

### 5.5 Dashboard — `/app`  *(all PROJECTED — the route is a placeholder today)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/dashboard/summary/?range=30d` | `DashboardSummary` |
| **P** | GET | `/repositories/?ordering=-risk&page_size=5` | `Paginated<Repository>` |
| **P** | GET | `/activity/?page_size=12` | `Paginated<ActivityEvent>` |
| **P** | GET | `/analysis/jobs/?status=running` | `Paginated<AnalysisJob>` |

```ts
interface DashboardSummary {
  health:          { score: number; trend: Trend };
  risk:            { score: number; trend: Trend };
  commitsAnalyzed: { count: number; trend: Trend };
  alerts:          { total: number; critical: number; high: number; trend: Trend };
}
```

Every `Trend` is `{direction, delta, sentiment}`. `sentiment` is **not** derivable
from `direction`: risk going *up* is `negative`, health going *up* is `positive`.
The backend decides sentiment per metric; the frontend only colours it.

`ActivityEvent.href` is a **frontend route path** (`/app/commits/abc123`), which
means the backend must know the frontend's URL shapes for this one field. Keep
route construction in a single serializer helper so it is one place to change.

### 5.6 Repositories — `/app/repositories` *(PROJECTED)*

| | Method | Path | Notes |
| --- | --- | --- | --- |
| **P** | GET | `/repositories/` | `Paginated<Repository>`; filters below |
| **P** | GET | `/repositories/{id}/` | `Repository` |
| **P** | PATCH | `/repositories/{id}/` | `{monitoring}` — pause/resume |
| **P** | DELETE | `/repositories/{id}/` | Stop monitoring, `204` |
| **P** | POST | `/repositories/` | `{repository_ids, branch}` — connect more |
| **P** | POST | `/repositories/{id}/reanalyze/` | Returns `AnalysisJob` |

Filters: `search`, `monitoring`, `language`, `visibility`, `riskLevel`,
`ordering` over `risk|health|name|lastCommitAt|lastAnalyzedAt`.

`Repository` carries eleven derived numbers (`health`, `risk`, `commitsAnalyzed`,
`openAlerts`, `criticalAlerts`, `testCoverage`, `contributorCount`, plus four
timestamps and two `Trend` objects). Computing these per row on every list
request will not scale — they are denormalized onto the `Repository` row and
refreshed by the analysis pipeline. See `docs/database.md`.

`testCoverage` is `number` and **not** nullable in the current type. Phase 10 of
the brief requires distinguishing "0% coverage" from "unknown coverage", which
the type cannot express. **This is a genuine contract problem** — see §9.

### 5.7 Repository detail — `/app/repositories/{id}` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/repositories/{id}/health/` | `RepositoryHealth` |
| **P** | GET | `/repositories/{id}/insights/` | `RepositoryInsight[]` (bare, small, bounded) |
| **P** | GET | `/repositories/{id}/branches/` | `BranchRef[]` (bare) |
| **P** | GET | `/repositories/{id}/commits/` | `Paginated<Commit>` |
| **P** | GET | `/repositories/{id}/pull-requests/` | `Paginated<PullRequest>` |
| **P** | GET | `/repositories/{id}/hotspots/` | `Paginated<Hotspot>` |
| **P** | GET | `/repositories/{id}/modules/` | `RiskModule[]` (bare — it is a graph) |
| **P** | GET | `/repositories/{id}/analytics/?range=30d` | `AnalyticsOverview` |

`RepositoryHealth.breakdown` is five `HealthComponent` entries with **fixed keys
and fixed weights**, taken from `lib/mock/analysis.ts:HEALTH_WEIGHTS`:

| `key` | `label` | `weight` |
| --- | --- | --- |
| `codeQuality` | Code quality | 0.24 |
| `testing` | Test coverage | 0.22 |
| `stability` | Stability | 0.20 |
| `security` | Security posture | 0.18 |
| `reliability` | Deployment reliability | 0.16 |

Weights sum to 1.00. The composite `score` must equal the weighted sum of the
component scores, rounded — the UI presents the breakdown as a decomposition of
the headline number, and a breakdown that does not reconstruct the headline is a
visible lie. The formula is documented in `docs/analysis-pipeline.md`.

`RiskModule.layout` is `{x: number, y: number}` with each axis in 0–1. The
backend supplies a layout hint for the risk-map graph; a deterministic layout
(e.g. by module path hash, or a simple force-free grid) is acceptable and must be
stable across requests so the map does not jump between polls.

### 5.8 Commits — `/app/commits`, `/app/commits/{id}` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/commits/` | `Paginated<Commit>` |
| **P** | GET | `/commits/{id}/` | `Commit` |
| **P** | GET | `/commits/{id}/analysis/` | `CommitAnalysis` |

Filters: `repository`, `branch`, `riskLevel` (comma-separated), `author`,
`analyzed`, `since`, `until`, `search` (message + sha prefix), `ordering` over
`committedAt|riskScore`.

`Commit.id` is a RepoGuard id, distinct from `Commit.sha` (the 40-char Git object
name). Both are in the type; do not conflate them. Detail routes key on `id`.

`CommitAnalysis` is the explainability payload:

- `factors: RiskFactor[]` — ordered by `contribution` **descending**, and the
  contributions "sum to ~100" per the type's own comment. If SHAP values are used
  they must be normalized to that convention before serialization.
- `changedFiles: ChangedFile[]` — each with `patch` (a unified diff string, fed
  straight into the Monaco viewer in `components/code/code-diff.tsx`) and
  `riskMarkers` anchored to **new-file line numbers**.
- `modelVersion: string`, `confidence: number` (0–1), `analyzedAt: string`.
- `recommendation` and `explanation` are prose strings.

`confidence` must be an honest model-confidence estimate, not a restatement of the
score. If the model does not produce a calibrated confidence, this field's
derivation must be documented in `docs/ml-pipeline.md` rather than invented.

**`analyzed: false` is a first-class state.** A commit ingested but not yet scored
returns `analyzed: false`; `riskScore`/`riskLevel` must then carry the model's
absence honestly — see §9 item 3.

### 5.9 Pull requests *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/pull-requests/` | `Paginated<PullRequest>` |
| **P** | GET | `/pull-requests/{id}/` | `PullRequest` |
| **P** | GET | `/pull-requests/{id}/analysis/` | `PullRequestAnalysis` |

Filters: `repository`, `state`, `riskLevel`, `author`, `needsReview`, `search`,
`ordering` over `updatedAt|riskScore|number`.

`PullRequestAnalysis.recommendedActions` is `string[]` "in priority order" —
ordering is semantic and the backend owns it.

### 5.10 Risk hotspots — `/app/hotspots` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/hotspots/` | `Paginated<Hotspot>` |
| **P** | GET | `/hotspots/{id}/` | `FileRisk` — the detail panel |

`FileRisk` extends the hotspot with `reasons: string[]`, `contributors`, `churn`,
and `history: RiskHistoryPoint[]` (`{date, score}`), bucketed by day or week
depending on the requested range. Accept `?range=` on the detail endpoint.

### 5.11 Analytics — `/app/analytics` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/analytics/overview/?range=30d&repository=<id>` | `AnalyticsOverview` |

One request returns the whole workspace: `riskTrend`, `riskDistribution`,
`coverageTrend`, `churnTrend`, `healthTrend`, `topRiskyFiles`, `topRiskyModules`,
`summary`. Four `MetricSeries` plus three aggregates in a single payload is a lot
of database work — it must be assembled from pre-aggregated daily snapshot rows,
not by scanning commits at request time. `range` is one of `7d|30d|90d|6m|1y`;
bucket by day for `7d`/`30d`, by week for `90d`/`6m`, by month for `1y`, so point
counts stay bounded (≤ 90).

Each `MetricSeries` carries `average`, `peak`, and a `trend` computed against the
*preceding equal-length window*.

### 5.12 Alerts — `/app/alerts` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/alerts/` | `Paginated<Alert>` |
| **P** | GET | `/alerts/{id}/` | `Alert` |
| **P** | POST | `/alerts/{id}/read/` | `Alert` |
| **P** | POST | `/alerts/{id}/resolve/` | `Alert` |
| **P** | POST | `/alerts/read-all/` | `204` |
| **P** | GET | `/alerts/count/` | `{total, critical, high, unread}` — sidebar badge |

Filters: `repository`, `severity`, `status`, `kind`, `search`.

The sidebar's `badge: "alerts"` (`lib/navigation.ts`) needs a cheap count on
every page. `/alerts/count/` exists so the badge does not pull a full page of
alerts. `Alert.source` is nullable — a repository-level alert has no commit.

### 5.13 Team — `/app/team` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET | `/team/activity/?range=30d` | `TeamActivity` |

`TeamMemberActivity.averageChangeRisk` and `riskDistribution` exist, and
`types/analytics.ts` says in a comment: "Deliberately not a developer ranking."
The backend must not add a rank, score, or ordering-by-quality field. Default
ordering is by `commits` descending — volume, not judgement.

### 5.14 Settings — `/app/settings` *(PROJECTED)*

| | Method | Path | Response |
| --- | --- | --- | --- |
| **P** | GET / PATCH | `/settings/analysis/` | `AnalysisSettings` |
| **P** | GET / PATCH | `/settings/notifications/` | `NotificationSettings` |
| **P** | GET | `/github/webhooks/` | `GitHubWebhook[]` (bare) |
| **P** | POST | `/github/webhooks/{id}/redeliver/` | `GitHubWebhook` |

`AnalysisSettings.highRiskThreshold` and `.criticalRiskThreshold` are the
user-configurable band boundaries (0–100, inclusive lower bounds). **These must
actually drive `riskLevel` derivation server-side** — if a user sets the critical
threshold to 90, a commit scoring 85 must serialize as `high`, not `critical`.
Storing the setting and ignoring it is worse than not offering it.

`GitHubWebhook.lastDeliveryStatus` is `number | null` — the HTTP status of the
most recent delivery, null if never delivered.

### 5.15 Webhook ingress — GitHub → RepoGuard

| | Method | Path | Auth |
| --- | --- | --- | --- |
| **P** | POST | `/webhooks/github/` | **None.** HMAC signature only. |

Deliberately at `/webhooks/github/`, not under `/github/`, so the inbound
(GitHub→us, unauthenticated, signature-verified) surface is never confused with
the outbound management surface (`/github/*`, session-authenticated). Full
handling in `docs/webhook-flow.md`.

### 5.16 Operational

| | Method | Path | Auth | Response |
| --- | --- | --- | --- | --- |
| **P** | GET | `/health/` | None | `{status, database, redis, version}` |
| **P** | GET | `/schema/` | None in dev | OpenAPI 3.1 document |
| **P** | GET | `/docs/` | None in dev | Swagger UI |

### 5.17 Deliberately not specified

The command palette (`⌘K`) keeps `recentSearches` in `store/ui-store.ts` as
client-only state and its `COMMAND_GROUPS` (`Navigate`, `Repositories`, `Recent`,
`Actions`) are served from already-cached repository and activity queries. **There
is no global search endpoint in the contract** because the frontend does not call
one. Adding `/search/` before a screen needs it would be guessing.

---

## 6. Field-by-field response schemas

Rather than duplicate them here and let the two copies drift, the authoritative
schemas are the TypeScript interfaces in `types/`. Each DRF serializer must be a
field-for-field mirror of its counterpart:

| Serializer | Mirrors |
| --- | --- |
| `UserSerializer` | `types/account.ts:User` |
| `GitHubConnectionSerializer` | `types/account.ts:GitHubConnection` |
| `GitHubWebhookSerializer` | `types/account.ts:GitHubWebhook` |
| `AvailableRepositorySerializer` | `types/account.ts:AvailableRepository` |
| `AnalysisSettingsSerializer` | `types/account.ts:AnalysisSettings` |
| `NotificationSettingsSerializer` | `types/account.ts:NotificationSettings` |
| `RepositorySerializer` | `types/repository.ts:Repository` |
| `RepositoryHealthSerializer` | `types/repository.ts:RepositoryHealth` |
| `RepositoryInsightSerializer` | `types/repository.ts:RepositoryInsight` |
| `BranchRefSerializer` | `types/repository.ts:BranchRef` |
| `CommitSerializer` | `types/commit.ts:Commit` |
| `CommitAnalysisSerializer` | `types/commit.ts:CommitAnalysis` |
| `ChangedFileSerializer` | `types/commit.ts:ChangedFile` |
| `FileRiskSerializer` | `types/commit.ts:FileRisk` |
| `PullRequestSerializer` | `types/pull-request.ts:PullRequest` |
| `PullRequestAnalysisSerializer` | `types/pull-request.ts:PullRequestAnalysis` |
| `AlertSerializer` | `types/risk.ts:Alert` |
| `HotspotSerializer` | `types/risk.ts:Hotspot` |
| `RiskModuleSerializer` | `types/risk.ts:RiskModule` |
| `AnalyticsOverviewSerializer` | `types/analytics.ts:AnalyticsOverview` |
| `TeamActivitySerializer` | `types/analytics.ts:TeamActivity` |
| `ActivityEventSerializer` | `types/analytics.ts:ActivityEvent` |
| `DashboardSummarySerializer` | `types/analytics.ts:DashboardSummary` |
| `AnalysisJobSerializer` | `lib/analysis/pipeline.ts:AnalysisJob` |

**Contract test requirement (Phase 13):** a test suite that asserts each
serializer's output keys exactly equal the keys of its TypeScript counterpart.
Drift between these two lists is the single most likely way this integration
breaks, and it must fail CI rather than fail in a browser.

Conventions that apply to all of them:

- **Timestamps** are ISO 8601 strings with timezone (`2026-09-16T04:12:33Z`).
  DRF's default `DateTimeField` output is correct; `USE_TZ = True`.
- **Ids** are strings, always — even where the underlying column is an integer.
- **Nullable fields** are `null`, never omitted. `description: string | null` must
  serialize the key with a `null` value.
- **Optional fields** (`?` in TypeScript — `Commit.body`, `Commit.confirmedDefect`,
  `ActivityEvent.riskScore`, `AnalysisStage.detail`, `RepositoryInsight.href`) may
  be omitted *or* null. Prefer omitting when genuinely not applicable and `null`
  when the value is unknown; the distinction is meaningful in §9.
- **Percentages** (`health`, `risk`, `riskScore`, `testCoverage`, component
  `score`, `contribution`, `magnitude`) are **0–100 integers**.
- **Probabilities** (`confidence`, `HealthComponent.weight`) are **0–1 floats**.
  These two scales are mixed in the same payloads; getting one wrong renders a
  confidence of "0.91" as 1%.

---

## 7. Authentication, authorization, isolation

### 7.1 Permission matrix

| Surface | Permission |
| --- | --- |
| `POST /auth/register/`, `POST /auth/login/` | `AllowAny`, throttled |
| `POST /webhooks/github/` | `AllowAny` + HMAC signature (§ `docs/webhook-flow.md`) |
| `GET /health/` | `AllowAny` |
| Everything else | `IsAuthenticated` **and** object-level ownership |

### 7.2 Multi-tenant isolation

Every repository-scoped resource is reachable only by the user who owns the
GitHub installation it came from. The rule, stated as code:

```python
class OwnsRepository(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.repository.installation.user_id == request.user.id
```

and, more importantly, **every queryset is filtered at the source**:

```python
def get_queryset(self):
    return Commit.objects.filter(repository__installation__user=self.request.user)
```

Object-level permissions alone are not sufficient — a list endpoint never calls
`has_object_permission`, so a missing queryset filter leaks the whole table. The
filtered-queryset pattern is mandatory on every viewset.

**A resource the user does not own returns `404`, not `403`.** A 403 confirms the
resource exists, which leaks the existence of another tenant's repository. The
only 403s in this API are for actions a user is authenticated for but not
permitted to take on something they *can* see.

### 7.3 CSRF

DRF's `SessionAuthentication` enforces CSRF on unsafe methods, and the client
sends no `X-CSRFToken`. Two viable resolutions:

1. **Custom authentication class** that subclasses `SessionAuthentication` and
   skips `enforce_csrf`, relying on `SameSite=Lax` + strict CORS origins for
   cross-site request forgery protection. Simplest, and defensible given
   `SameSite=Lax` blocks cross-site POSTs in every browser the product targets.
2. **Issue a CSRF cookie** and change `lib/api/client.ts` to read it and set the
   header. This is a frontend change.

**Resolution: option 1**, because the frontend is the source of truth and option 2
modifies it without a genuine contract defect forcing the change. The security
rationale and its limits are written up in `docs/security.md` rather than left
implicit — `SameSite=Lax` is the load-bearing control and that must be stated.

### 7.4 What must never appear in a response

GitHub access tokens, GitHub App private keys, webhook secrets, refresh tokens,
Django `SECRET_KEY`, database credentials, internal stack traces. The only
GitHub-derived fields the frontend ever receives are those on
`GitHubConnection` — a boolean, two nullable display strings, a scope list, a
timestamp, and an expiry flag.

---

## 8. Idempotency

| Operation | Idempotency key | Behaviour on repeat |
| --- | --- | --- |
| Webhook delivery | `X-GitHub-Delivery` header | Second delivery → `200`, no new job |
| Commit ingestion | `(repository_id, sha)` unique | Upsert, never duplicate |
| Pull request ingestion | `(repository_id, number)` unique | Update in place |
| Analysis job creation | `(repository_id, scope_ref, status in (queued,running))` | Return existing job, `200` |
| Risk prediction | `(commit_id, model_version, feature_version)` unique | Skip if present |
| Alert generation | `(repository_id, kind, source_type, source_id)` while `status != resolved` | Do not re-raise |

GitHub explicitly documents that webhooks may be delivered more than once. The
delivery-id table is the outermost guard and must be written **before** the
Celery task is queued, inside the same transaction.

---

## 9. Conflicts found between the generic specification and the real frontend

Per the instruction that the frontend is the source of truth, each is resolved in
the frontend's favour unless it is a genuine defect. Three are, and are flagged.

**1. Error envelope — spec says nested, frontend requires flat.**
Spec: `{"error": {"code", "message", "details"}}`. `parseErrorResponse` reads
top-level `detail`/`message`/`code`. The nested shape produces a generic banner
for every error. **Resolved: flat.** Not a frontend defect.

**2. Enum casing — spec says `HIGH`/`ACTIVE`/`COMPLETED`, frontend requires lowercase.**
Every union in `types/` is lowercase and the values are used directly as style
keys. **Resolved: lowercase.** Not a frontend defect.

**3. Job status token — spec says `COMPLETED`, frontend requires `complete`.**
`lib/analysis/pipeline.ts:AnalysisJobStatus = "queued"|"running"|"complete"|"failed"`.
**Resolved: `complete`.** Not a frontend defect.

**4. Base path — spec says `/api/`, frontend defaults to `/api/v1/`.**
**Resolved: `/api/v1/`.** Not a frontend defect.

**5. Auth — spec offers "JWT or secure session", frontend has already chosen.**
No `Authorization` header exists in the client; `credentials: "include"` does.
**Resolved: cookie session.** Not a frontend defect.

**6. Risk factor shape — spec's example uses `{name, contribution, severity}`; the type is `{key, label, contribution, magnitude, level, description}`.**
**Resolved: the type.** Not a frontend defect.

**7. ⚠️ GENUINE DEFECT — `testCoverage: number` cannot express "unknown".**
`Repository.testCoverage`, `Hotspot.testCoverage`, and `FileRisk.testCoverage` are
all non-nullable `number`. Phase 10 of the brief requires distinguishing 0%
coverage from unknown coverage, and §31 forbids inventing a value. A repository
with no coverage reporting has no honest value to put here — `0` is a
fabrication that will render as a red "0% coverage" bar.
**Proposed narrow frontend change (deferred to Phase 12, not made now):** widen to
`testCoverage: number | null` in the three types and render `null` as
"Not reported". This is additive at the type level and touches display only. It
is logged here rather than applied because it should land together with the
components that render it, and no component renders it today.

**8. ⚠️ GENUINE DEFECT — `Commit.riskScore` / `riskLevel` are non-nullable but `analyzed` can be false.**
An ingested-but-unscored commit has no risk score. The type forces one.
**Proposed narrow frontend change (deferred, same reasoning):** `riskScore: number | null`
and `riskLevel: RiskLevel | null`, guarded by the existing `analyzed` flag. Until
that lands, the backend must not emit an unscored commit through a list endpoint
that the risk column reads; the interim rule is that `analyzed: false` rows are
returned with `riskScore: 0, riskLevel: "low"` **only** alongside
`analyzed: false`, and every consumer must branch on `analyzed` first. This is
recorded as a known limitation, not presented as correct.

**9. ⚠️ NOTE — `Repository.health`/`risk` are required at creation time.**
A repository connected thirty seconds ago has no analysis behind it. The
`monitoring: "pending"` state exists for exactly this, and the frontend's
repository picker already uses it. Rule: a repository in `pending` state must be
rendered by its status, never by its (meaningless) scores. This constrains the
Repositories screen when it is built in Phase 12.

**10. `AnalysisSettings` thresholds must drive severity.**
Not a conflict — a requirement easy to miss. See §5.14.

---

## 10. Change control

The contract in §1–§4 and every **OBSERVED** endpoint is frozen: changing it
means changing committed frontend code, which the brief forbids absent a genuine
defect. **PROJECTED** endpoints may be revised as their screens are built, but the
*types* they return may not — those are already committed.

Any change to this document must be accompanied by the corresponding change to
`types/` and to the serializer contract tests described in §6.
