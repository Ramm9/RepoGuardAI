# RepoGuard — Data Model

**Status:** Phase 0 deliverable. Implemented in Phase 2.
**Database:** PostgreSQL 16.

Every model below exists to serve a field in `api-contract.md`. Where a column is
denormalized, the reason is stated. Where a column is nullable, the null is
*meaningful* and its meaning is stated — this system distinguishes "zero",
"unknown", and "not applicable", and the schema is the first place that
distinction has to hold.

---

## 1. Ownership graph

Every row in the system traces to exactly one `User` through this chain. That is
what makes tenant isolation a `JOIN` rather than a convention.

```
User
 └── GitHubInstallation            (one per GitHub App install)
      └── Repository                (only those the user selected)
           ├── RepositoryBranch
           ├── Commit
           │    ├── CommitFile
           │    ├── CodeMetric  ·  TestMetric  ·  DependencyMetric
           │    └── RiskPrediction
           │         ├── RiskFactor
           │         └── RiskRecommendation
           ├── PullRequest
           │    ├── PullRequestFile
           │    └── RiskPrediction
           ├── RiskHotspot
           ├── RepositoryHealthSnapshot
           ├── RepositoryMetricSnapshot
           ├── AnalysisJob
           │    └── AnalysisJobStage
           └── Alert
                └── Notification
```

`ModelVersion` and `FeatureVersion` are global (not user-scoped) — they describe
the software, not the tenant.

---

## 2. Conventions

- **Primary keys:** `UUIDv4`, `default=uuid4`, `editable=False`. The API exposes
  ids as strings (`api-contract.md` §6) and UUIDs avoid leaking row counts or
  letting a user enumerate another tenant's ids.
- **Timestamps:** every table has `created_at` (auto-add) and `updated_at`
  (auto-now). `USE_TZ = True`; all datetimes are UTC.
- **GitHub identifiers:** stored as `BigIntegerField` (`github_id`) *and* as the
  human string (`full_name`). GitHub ids are stable across renames; names are not.
- **Soft delete:** only on `Repository` (`disconnected_at`). Analysis history
  survives a disconnect so reconnecting does not lose a year of measurements.
  Everything else is hard-deleted by cascade.
- **Enum columns:** `CharField(choices=...)` with **lowercase** values matching
  `api-contract.md` §2 exactly. No `IntegerChoices` — the wire format is a string
  and translating twice invites a mismatch.
- **Money/score columns:** scores are `SmallIntegerField` 0–100; probabilities are
  `FloatField` 0–1. The two scales coexist in the same payloads, so the column
  type is the guard rail.

---

## 3. Tables

### 3.1 `users_user`

Extends `AbstractBaseUser` + `PermissionsMixin`, `USERNAME_FIELD = "email"`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `email` | citext unique | Case-insensitive; `CITEXT` extension |
| `name` | varchar(150) | Maps to `User.name` |
| `password` | varchar | Django PBKDF2 (or Argon2 if `argon2-cffi` present) |
| `avatar_url` | varchar null | null = no avatar; frontend renders initials |
| `is_active` `is_staff` `date_joined` | | Django standard |

`User.githubUsername` in the API is **not** a column — it is read through
`installation.account_login`. Denormalizing it would create two places for it to
be wrong when a user renames their GitHub account.

### 3.2 `users_analysissettings` · `users_notificationsettings`

One-to-one with `User`, created by a `post_save` signal so the row always exists.

`AnalysisSettings`: `analyze_every_push`, `analyze_pull_requests`,
`dependency_analysis`, `advanced_code_analysis` (bool),
`high_risk_threshold` (smallint, default 60), `critical_risk_threshold`
(smallint, default 85).

> `CheckConstraint`: `0 <= high_risk_threshold < critical_risk_threshold <= 100`.
> These thresholds **drive** `riskLevel` derivation (`api-contract.md` §5.14) —
> storing them without applying them would be worse than not offering the setting.

`NotificationSettings`: `email`, `browser`, `github` (bool),
`minimum_severity` (choices `low|medium|high|critical`, default `medium`).

### 3.3 `github_githubinstallation`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `user` | FK → User, CASCADE | |
| `installation_id` | bigint **unique** | GitHub's installation id |
| `account_login` | varchar | Org or user the App is installed on |
| `account_type` | varchar | `User` \| `Organization` |
| `account_avatar_url` | varchar null | |
| `permissions` | jsonb | Raw grant from GitHub, e.g. `{"contents":"read"}` |
| `repository_selection` | varchar | `all` \| `selected` |
| `token_encrypted` | bytea null | **Encrypted at rest.** Never serialized. |
| `token_expires_at` | timestamptz null | Installation tokens live ~1 hour |
| `status` | varchar | `active` \| `expired` \| `revoked` \| `error` |
| `connected_at` | timestamptz | → `GitHubConnection.connectedAt` |
| `last_error` | text null | Operator-facing; never returned by the API |

`GitHubConnection.scopes` is derived from `permissions` as
`["contents:read", "metadata:read", "pull_requests:read"]`.
`GitHubConnection.expired` is `status in ("expired", "revoked")`.

**The token column is the highest-value secret in the database.** It is encrypted
with a key from `GITHUB_TOKEN_ENCRYPTION_KEY` (Fernet), excluded from every
serializer, excluded from `__str__`/`__repr__`, and excluded from Django admin.
It is also short-lived and re-mintable from the App private key, so the blast
radius of a database read is one hour of read-only access — which is precisely
why the GitHub App was chosen over an OAuth token (`architecture.md` §6).

### 3.4 `repositories_repository`

The widest table in the schema, because `types/repository.ts:Repository` carries
eleven derived numbers and the repository list must not compute them per row.

| Column | Type | Serves |
| --- | --- | --- |
| `id` | uuid PK | `Repository.id` |
| `installation` | FK → GitHubInstallation, CASCADE | Ownership chain |
| `github_id` | bigint | Stable across rename |
| `name` `owner` `full_name` | varchar | `name`, `owner`, `fullName` |
| `description` | text null | null = GitHub has none |
| `language` | varchar null | GitHub's primary language; null if undetermined |
| `visibility` | varchar | `public`\|`private`\|`internal` |
| `default_branch` | varchar | |
| `stars` `open_issues` | integer | `AvailableRepository` |
| `monitoring` | varchar | `active`\|`paused`\|`error`\|`pending` |
| `monitored_since` | timestamptz null | `monitoredSince` |
| `disconnected_at` | timestamptz null | Soft delete |
| `baseline_branch` | varchar | Branch chosen at onboarding |
| `history_depth_days` | integer | Ingestion window (default 90) |
| **Denormalized rollups** | | |
| `health_score` | smallint null | `health` — **null until first analysis** |
| `health_trend_*` | 3 cols | `healthTrend` (direction/delta/sentiment) |
| `risk_score` | smallint null | `risk` — null until first analysis |
| `risk_trend_*` | 3 cols | `riskTrend` |
| `commits_analyzed` | integer default 0 | |
| `open_alerts` `critical_alerts` | integer default 0 | Maintained by `alerts` |
| `test_coverage` | real **null** | **null = not reported.** See §5. |
| `contributor_count` | integer default 0 | |
| `last_commit_at` | timestamptz null | |
| `last_analyzed_at` | timestamptz null | null = never analyzed |
| `webhook_id` | bigint null | GitHub hook id, for teardown |
| `webhook_secret_encrypted` | bytea null | Per-repository secret |

```
UNIQUE (installation, github_id)
INDEX  (installation, monitoring)
INDEX  (installation, -risk_score)          -- default repository ordering
INDEX  (installation, -last_commit_at)
```

`health_score` and `risk_score` are nullable at the database level even though
`api-contract.md` types them as required. That is intentional: the row is real
before the analysis is, and `monitoring: "pending"` is how the API expresses it
(§9 item 9 of the contract). The serializer must refuse to emit a pending
repository's scores as if they were measurements.

### 3.5 `repositories_repositorybranch`

`repository` FK · `name` · `is_default` bool · `last_commit_sha` ·
`last_commit_at` · `risk_score` smallint null · `is_tracked` bool.

```
UNIQUE (repository, name)
```

Serves `BranchRef`. `is_tracked` distinguishes branches we analyze from branches
we merely know exist — analyzing every feature branch is unbounded work.

### 3.6 `commits_commit`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `Commit.id` — **not** the sha |
| `repository` | FK, CASCADE | |
| `sha` | char(40) | `Commit.sha` |
| `parent_shas` | varchar[] | Array; >1 element = merge commit |
| `branch` | varchar | Branch the commit was observed on |
| `message` | text | First line → `message` |
| `body` | text null | → `Commit.body` (optional) |
| `author_username` `author_name` `author_avatar_url` | varchar | `CommitAuthor` |
| `author_email` | citext | Not exposed by the API; used for identity linking |
| `committed_at` | timestamptz | |
| `files_changed` `additions` `deletions` | integer | |
| `is_merge` | bool | |
| `is_bug_fix` | bool null | **Inferred label.** null = not evaluated. `ml-labeling-strategy.md` |
| `bug_fix_confidence` | real null | Confidence in the above |
| `reverts_sha` | char(40) null | Populated from revert detection |
| `confirmed_defect` | bool null | → `Commit.confirmedDefect`; null = unknown |
| `analyzed` | bool default false | → `Commit.analyzed` |

```
UNIQUE (repository, sha)                    -- idempotency for ingestion
INDEX  (repository, -committed_at)
INDEX  (repository, branch, -committed_at)
INDEX  (repository, analyzed)
INDEX  (sha)                                -- webhook lookup by sha alone
```

`riskScore` / `riskLevel` are **not columns here.** They live on the current
`RiskPrediction` and are joined in. A commit can be re-scored by a new model
version without rewriting the commit row, and both scores stay inspectable.

### 3.7 `commits_commitfile`

`commit` FK · `path` · `previous_path` null (renames) · `change_type`
(`added|modified|removed|renamed`) · `language` null · `additions` `deletions`
`changes` · `patch` text null · `blob_sha`.

```
UNIQUE (commit, path)
INDEX  (commit)
INDEX  (path)      -- file history across commits, for hotspots
```

`patch` is the unified diff GitHub returns and is fed to the Monaco viewer via
`ChangedFile.patch`. It is null when the diff is unavailable — GitHub omits it for
binary files and truncates very large ones. **A truncated patch must be stored as
null, not as a partial diff**; a partial diff rendered as complete is a lie the
viewer cannot detect.

> **Retention.** `patch` is the only place raw source text is persisted, and the
> onboarding screen promises "Diffs are discarded, metrics are kept". A retention
> job nulls `patch` after `DIFF_RETENTION_DAYS` (default 30). Metrics computed
> from it survive. See `security.md`.

### 3.8 `pull_requests_pullrequest`

`repository` FK · `github_id` bigint · `number` integer · `title` · `body` null ·
`author_*` · `state` (`open|merged|closed|draft`) · `source_branch`
`target_branch` · `files_changed` `additions` `deletions` `commit_count` ·
`needs_review` bool · `created_at_github` `updated_at_github` `merged_at` null ·
`merge_commit_sha` null · `analyzed` bool.

```
UNIQUE (repository, number)                 -- idempotency
INDEX  (repository, state, -updated_at_github)
```

`pull_requests_pullrequestfile`: `pull_request` FK · `path` · `additions`
`deletions` · `change_type`, `UNIQUE (pull_request, path)`.

### 3.9 Metric tables

Deliberately three tables, not one wide one. They have different cardinality
(per-file, per-commit, per-commit) and different availability — code metrics
almost always exist, coverage usually does not.

**`metrics_codemetric`** — one row per (commit, file).

`commit` FK · `commit_file` FK · `path` · `language` ·
`lines_total` `lines_added` `lines_deleted` ·
`function_count` `class_count` `branch_count` `max_nesting_depth`
`cyclomatic_complexity` `max_function_length` `import_count` (all **smallint
null**) · `churn` real null · `file_age_days` int null ·
`commit_frequency_30d` int null · `contributor_count` int null ·
`historical_bug_count` int null · `historical_revert_count` int null ·
`analyzer` varchar · `analyzer_version` varchar · `parse_failed` bool.

```
UNIQUE (commit, path)
INDEX  (path, -created_at)
```

**Every metric column is nullable, and that is the point.** A `.md` file has no
cyclomatic complexity; a file that failed to parse has none either. `parse_failed`
distinguishes "not applicable" from "we tried and could not" — and both are
distinct from `0`. Writing `0` for any of these poisons the training set.

**`metrics_testmetric`** — one row per commit.

`commit` FK unique · `coverage_available` bool · `coverage_percent` real null ·
`covered_lines` `total_lines` int null · `test_file_count` int null ·
`test_lines_changed` int null · `source` varchar
(`codecov|coveralls|lcov|coverage_xml|none`) · `collected_at`.

```
CHECK (NOT coverage_available OR coverage_percent IS NOT NULL)
```

The constraint enforces the distinction the brief's Phase 10 requires:

| Situation | `coverage_available` | `coverage_percent` |
| --- | --- | --- |
| Repository reports 0% coverage | `true` | `0.0` |
| Repository reports no coverage data | `false` | `null` |
| Coverage provider errored | `false` | `null` (+ `source="none"`) |

**`metrics_dependencymetric`** — one row per commit.

`commit` FK unique · `manifest_changed` bool · `dependencies_added`
`dependencies_removed` `dependencies_updated` int · `major_version_bumps` int ·
`manifests` jsonb (which files changed) · `lockfile_changed` bool.

### 3.10 `analysis_analysisjob`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `AnalysisJob.id` |
| `user` | FK, CASCADE | Job ownership without a repository join |
| `kind` | varchar | `initial_scan`\|`push`\|`pull_request`\|`rescan`\|`scheduled` |
| `status` | varchar | **`queued`\|`running`\|`complete`\|`failed`\|`cancelled`** |
| `progress` | smallint default 0 | 0–100, monotonic |
| `repositories` | M2M → Repository | `repositoryIds[]` |
| `primary_repository` | FK null | First id; owns `branch` |
| `branch` | varchar null | |
| `commit` / `pull_request` | FK null | Scope for per-change jobs |
| `idempotency_key` | varchar | See below |
| `celery_task_id` | varchar null | For revocation |
| `error_code` `error_message` | varchar/text null | Populated on `failed` |
| `result` | jsonb null | `AnalysisJobResult`, only when `complete` |
| `started_at` `finished_at` | timestamptz null | |
| `attempt` | smallint default 0 | Retry counter |

```
UNIQUE (idempotency_key) WHERE status IN ('queued','running')   -- partial index
INDEX  (user, -created_at)
INDEX  (status, -created_at)
```

The **partial unique index** is the idempotency mechanism from
`api-contract.md` §8: while a job for a scope is in flight, a second create
attempt violates the constraint and the service returns the existing job. Once
the job reaches a terminal state the constraint releases, so re-analysis is
allowed. `idempotency_key` is
`sha256(f"{kind}:{repository_ids_sorted}:{branch}:{commit_sha or pr_number}")`.

`status` includes `cancelled` at the database level. It is **not** in
`AnalysisJobStatus` on the frontend (`queued|running|complete|failed`), so the
serializer maps `cancelled → failed` with `error_code = "cancelled"` until the
frontend type is widened. Recorded as a known limitation rather than a silent
coercion.

### 3.11 `analysis_analysisjobstage`

`job` FK · `stage_id` varchar · `label` varchar · `state`
(`waiting|running|complete`) · `detail` varchar null · `position` smallint ·
`started_at` `finished_at` null.

```
UNIQUE (job, stage_id)
INDEX  (job, position)
```

Seven rows are created **with the job**, all `waiting`, so the very first poll
returns the complete stage list the step indicator requires
(`api-contract.md` §4.1). `stage_id` and `label` are copied from a constant that
mirrors `lib/analysis/pipeline.ts:ANALYSIS_PIPELINE` — and a test asserts the two
lists are identical, because a drifting label is a silently wrong UI.

`detail` is null while `state = "waiting"`, enforced by a `CheckConstraint`. The
contract is explicit that a detail on an unstarted stage is a claim the run has
not earned; the database is the cheapest place to make that unrepresentable.

### 3.12 `risk_riskprediction`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `repository` | FK, CASCADE | Denormalized for tenant filtering |
| `commit` / `pull_request` | FK null | Exactly one is set |
| `target_type` | varchar | `commit`\|`pull_request` |
| `risk_score` | smallint | 0–100 |
| `risk_level` | varchar | `low`\|`medium`\|`high`\|`critical` |
| `defect_probability` | real | 0–1 — the model's raw output |
| `confidence` | real null | 0–1; **null if the model has no confidence estimate** |
| `regression_risk` | varchar null | PR-level; `PullRequestAnalysis.regressionRisk` |
| `explanation` | text | Prose |
| `recommendation` | text | Prose |
| `model_version` | FK → ModelVersion | |
| `feature_version` | varchar | |
| `feature_vector` | jsonb | The exact input, for reproducibility |
| `is_current` | bool | One current prediction per target |
| `analyzed_at` | timestamptz | |

```
UNIQUE (commit, model_version, feature_version)      -- re-score idempotency
UNIQUE (commit) WHERE is_current                     -- partial
INDEX  (repository, -analyzed_at)
INDEX  (repository, risk_level, -analyzed_at)
CHECK  ((commit_id IS NULL) <> (pull_request_id IS NULL))
```

`risk_score` is `round(defect_probability * 100)`. `risk_level` is derived from
the **user's** thresholds (§3.2), which is why it is stored rather than computed
on read — the band a prediction fell into when it was made is a historical fact,
and re-deriving it after a threshold change would silently rewrite history.

`feature_vector` is stored because a prediction you cannot reproduce is a
prediction you cannot debug. It is the single most useful column for answering
"why did this score 82 in March?"

### 3.13 `risk_riskfactor`

`prediction` FK · `key` varchar · `label` varchar · `contribution` smallint
(0–100) · `magnitude` smallint (0–100) · `level` varchar · `description` text ·
`position` smallint.

```
UNIQUE (prediction, key)
INDEX  (prediction, position)
```

Serves `RiskFactor[]`, ordered by `position` which is assigned by `contribution`
descending. Contributions sum to ~100 per the type's comment — normalization
happens in the explainability layer before persistence, not in the serializer.

Canonical `key` values: `high_code_churn`, `low_test_coverage`,
`unknown_test_coverage`, `high_complexity`, `historical_bug_hotspot`,
`dependency_change`, `high_change_frequency`, `large_change_size`,
`many_files_touched`, `recent_instability`, `single_contributor_file`,
`deep_nesting`. Lowercase snake_case, matching the enum convention.

`risk_riskrecommendation`: `prediction` FK · `text` · `position` ·
`action_type` null. Serves `PullRequestAnalysis.recommendedActions` (ordered).

### 3.14 `risk_riskmarker`

`prediction` FK · `path` · `line` integer · `level` · `label` · `reason`.

Serves `ChangedFile.riskMarkers`. `line` is a **new-file** line number
(`api-contract.md` §5.8) — anchoring to old-file numbers would place markers on
the wrong lines in the diff viewer.

### 3.15 `risk_riskhotspot`

`repository` FK · `path` · `language` null · `module` varchar ·
`risk_score` smallint · `risk_level` · `complexity` (`low|medium|high`) ·
`test_coverage` real **null** · `bug_count` int · `change_count` int ·
`contributor_count` int · `churn` (`low|medium|high`) · `reasons` jsonb
(`string[]`) · `last_changed_at` · `computed_at`.

```
UNIQUE (repository, path)
INDEX  (repository, -risk_score)
INDEX  (repository, module)
```

Recomputed by a scheduled job, not per request. Serves both `Hotspot` (list) and
`FileRisk` (detail) — `FileRisk.history` comes from §3.17.

`risk_riskmodule`: `repository` FK · `name` · `risk` smallint · `risk_level` ·
`file_count` · `depends_on` jsonb (module ids) · `layout_x` `layout_y` real.
`UNIQUE (repository, name)`. Layout coordinates are deterministic so the risk map
does not jump between polls.

### 3.16 `repositories_repositoryhealthsnapshot`

`repository` FK · `score` smallint · five component scores (`code_quality`,
`testing`, `stability`, `security`, `reliability`, each smallint **null**) ·
`weights` jsonb · `inputs` jsonb · `computed_at` · `is_current` bool.

```
UNIQUE (repository, computed_at::date)      -- one snapshot per day
INDEX  (repository, -computed_at)
UNIQUE (repository) WHERE is_current
```

`weights` is stored **per snapshot**, not read from a constant, so a historical
health score remains interpretable after the weighting changes. `inputs` records
the raw signals that produced each component — the formula is published
(`analysis-pipeline.md`) and the inputs make it auditable.

Component scores are nullable: a repository with no coverage data has no honest
`testing` component. Rendering it as 0 would claim a measurement that does not
exist. The composite then renormalizes across available components and records
which were missing in `inputs`.

### 3.17 `analytics_repositorymetricsnapshot`

`repository` FK · `date` date · `bucket` (`day|week|month`) ·
`avg_risk_score` real null · `high_risk_commit_count` int ·
`commit_count` int · `coverage_percent` real null · `churn` real null ·
`health_score` smallint null · `defect_rate` real null.

```
UNIQUE (repository, date, bucket)
INDEX  (repository, bucket, date)
```

This table is why `GET /analytics/overview/` can return four time series and
three aggregates in one indexed query instead of scanning commits. Written nightly
by `aggregate_daily_metrics`, plus incrementally after each analysis so today's
bucket is current.

### 3.18 `alerts_alert`

`repository` FK · `severity` (`critical|high|medium|low`) · `status`
(`open|read|resolved`) · `kind` varchar · `title` · `body` text ·
`source_type` null (`commit|pull_request|file|repository`) · `source_id` null ·
`source_label` null · `source_href` null · `rule_key` · `threshold_value` null ·
`observed_value` null · `read_at` null · `resolved_at` null.

```
UNIQUE (repository, kind, source_type, source_id) WHERE status <> 'resolved'
INDEX  (repository, status, -created_at)
INDEX  (repository, severity, status)
```

The partial unique index is the alert-storm guard: the same condition on the same
source cannot raise twice while it remains unresolved, but can raise again after
resolution. `threshold_value`/`observed_value` make an alert self-explanatory
after the fact ("risk 87 crossed your threshold of 85").

`alerts_notification`: `alert` FK · `channel` (`email|browser|github`) ·
`status` (`pending|sent|failed|suppressed`) · `sent_at` null · `error` null.
Separating dispatch from the alert keeps a failed email from mutating the alert's
own lifecycle.

### 3.19 `github_webhookdelivery`

`delivery_id` varchar **unique** · `event` varchar · `action` varchar null ·
`installation_id` bigint null · `repository_github_id` bigint null ·
`repository` FK null · `signature_valid` bool · `status`
(`accepted|ignored|rejected|duplicate|error`) · `payload_digest` char(64) ·
`job` FK null · `received_at` · `processing_error` text null.

```
UNIQUE (delivery_id)
INDEX  (-received_at)
INDEX  (repository, -received_at)
```

`delivery_id` is GitHub's `X-GitHub-Delivery` header and the outermost
idempotency guard. The row is written **before** the Celery task is enqueued, in
the same transaction, so a duplicate delivery hits the unique constraint rather
than racing the first one's task.

The raw payload is **not** stored — only `payload_digest` (SHA-256) for
debugging. Payloads contain commit messages and author emails, and keeping them
indefinitely is data we have no use for and a promise we did not make.

`github_githubwebhook` (management view, `GitHubWebhook` type): `repository` FK ·
`github_hook_id` bigint · `url` · `active` bool · `last_delivery_at` null ·
`last_delivery_status` smallint null · `events` jsonb.

### 3.20 `ml_engine_modelversion` · `ml_engine_featureversion`

`ModelVersion`: `version` varchar unique (`v1.0.0`) · `algorithm` · `artifact_path`
· `artifact_sha256` · `feature_version` · `trained_at` · `training_rows` ·
`positive_rate` real · `metrics` jsonb (precision/recall/F1/ROC-AUC/PR-AUC/
confusion matrix) · `calibration_method` null · `calibration_metrics` jsonb null ·
`is_active` bool · `notes` text.

```
UNIQUE (version)
UNIQUE (is_active) WHERE is_active        -- exactly one active model
```

`calibration_method` is nullable and **defaults to null**, which the API must
report honestly: the brief forbids claiming a probability is calibrated unless
calibration was actually evaluated. A null here means the `confidence` field is
an uncalibrated model artifact, and `ml-pipeline.md` says so in those words.

`artifact_sha256` guards against a swapped model file — a prediction attributed to
`v1.0.0` must have come from the bytes that were evaluated as `v1.0.0`.

`FeatureVersion`: `version` varchar unique · `feature_names` jsonb (ordered) ·
`spec` jsonb · `created_at`. The ordered name list is what makes a stored
`feature_vector` interpretable years later.

---

## 4. Index strategy

Indexes follow the query patterns in `api-contract.md`, not intuition.

| Query | Index |
| --- | --- |
| Repository list, default order | `(installation, -risk_score)` |
| Commit list for a repository | `(repository, -committed_at)` |
| Commit list filtered by branch | `(repository, branch, -committed_at)` |
| Commits pending analysis (worker) | `(repository, analyzed)` |
| Webhook lookup by sha | `(sha)` |
| Current prediction for a commit | `(commit) WHERE is_current` |
| Risk-filtered commit list | `(repository, risk_level, -analyzed_at)` on predictions |
| Alert badge count | `(repository, status, -created_at)` |
| Hotspot list | `(repository, -risk_score)` |
| Analytics window | `(repository, bucket, date)` |
| Job poll | PK only — single-row read |
| Webhook dedupe | `(delivery_id)` unique |

Full-text search (`?search=` on commits) uses a PostgreSQL `GIN` index on
`to_tsvector('english', message)` rather than `ILIKE '%term%'`, which cannot use
an index. Repository and path search stay on `trigram` (`pg_trgm`) because those
are substring matches over short strings.

---

## 5. Where nulls carry meaning

This is the part of the schema most easily got wrong, and the brief's Phase 31
turns on it. Collected in one place:

| Column | `null` means | Not to be confused with |
| --- | --- | --- |
| `test_coverage` | Not reported by the repository | `0.0` = measured at zero |
| `coverage_percent` + `coverage_available=false` | No coverage source | `0.0` + `true` |
| `cyclomatic_complexity` | Not applicable, or `parse_failed` | `0` = a file with no branches |
| `health_score` | Never analyzed (`monitoring="pending"`) | Low health |
| `risk_score` on a repository | Never analyzed | Low risk |
| `confidence` | Model produces no confidence estimate | Low confidence |
| `is_bug_fix` | Label not evaluated | `false` = evaluated, not a bug fix |
| `confirmed_defect` | Unknown | `false` = known not to have caused a defect |
| `language` | GitHub could not determine it | An empty string |
| `patch` | Unavailable, binary, truncated, or retention-expired | An empty diff |
| `calibration_method` | Calibration never evaluated | Calibration failed |

Every one of these reaches the API as `null` and the frontend must render it as
*unknown*, not as a zero. Substituting a default anywhere in this table is the
single easiest way to turn this product into one that fabricates measurements.

---

## 6. Migration and seeding

- Migrations are hand-reviewed; no `--fake` in any committed path.
- Extensions created in migration `0001`: `citext`, `pg_trgm`, `uuid-ossp`.
- **No production data in fixtures.** Test fixtures build synthetic
  repositories/commits (`tests/factories/`) using `factory_boy`. A fixture that
  looks like real GitHub data invites treating it as evidence.
- `python manage.py seed_demo --repositories 3 --commits 200` creates an
  explicitly-labelled demo tenant for local development. Every row it writes is
  marked `is_demo=true` on the repository so the API can flag demo data as demo
  (`api-contract.md` §31 requirement: the frontend must differentiate real,
  unavailable, and demo data).
