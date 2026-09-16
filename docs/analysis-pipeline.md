# RepoGuard — Analysis Pipeline

**Status:** Phase 0 deliverable. Implemented across Phases 7–11 and 14.
**Companions:** `webhook-flow.md` (what triggers it), `ml-pipeline.md` (the model),
`database.md` (where output lands).

This document defines what runs between "a commit arrived" and "the dashboard has
a number". Every formula the frontend depends on is written here explicitly so
that the backend and the existing UI cannot drift apart silently.

---

## 1. The seven stages are a contract, not a progress bar

`lib/analysis/pipeline.ts` declares seven stages with fixed ids and labels. The
backend does not get to invent an eighth, rename one, or reorder them — the
frontend renders `AnalysisStage[]` positionally and matches on `id`.

| # | `id` | Label (frontend-owned) | What the backend actually does |
| --- | --- | --- | --- |
| 1 | `connect` | Connected to GitHub | Mint installation token, verify repository access |
| 2 | `fetch` | Fetched repository | Metadata, languages, contributors, branch list |
| 3 | `history` | Read commit history | Walk commits within the history window |
| 4 | `metrics` | Calculated code metrics | AST, churn, complexity, coverage, dependencies |
| 5 | `profile` | Building reliability profile | Aggregate per-file and per-module history |
| 6 | `model` | Running ML model | Feature vector → probability → factors |
| 7 | `insights` | Generating insights | Hotspots, health snapshot, alerts, recommendations |

Rules the implementation must hold (restated from `api-contract.md` §4 because
this is where they get violated):

1. Exactly seven stages, always, in this order, from the moment the job row is
   created.
2. `detail` is `null` while a stage is `waiting`. It carries real substance
   afterwards — counts, truncations, skips — never decoration.
3. `progress` is monotonic and derived from completed stages, never from elapsed
   time. A stalled job shows a stalled bar; that is the correct signal.
4. A stage that fails sets the job to `failed` and leaves later stages `waiting`
   — not `complete`.
5. Stages may be *skipped* (recorded in `detail`), but a skipped stage is not a
   successful one and must say why.

The `durationMs` values in the frontend file are animation hints for the mock
layer. The backend ignores them entirely and reports real state.

---

## 2. Stage detail — what each one reports

`detail` is the only place the pipeline can be honest about incompleteness, so
it is specified rather than left to the implementer's mood.

| Stage | Example `detail` | Reports |
| --- | --- | --- |
| `connect` | `"acme/payments-api · read-only"` | Repository and access level |
| `fetch` | `"Python · 14 contributors · 6 branches"` | What was actually retrieved |
| `history` | `"1,000 of 6,412 commits (90-day window)"` | **Truncation, always, when it happens** |
| `metrics` | `"412 files analyzed · 18 unparseable · coverage unavailable"` | Successes *and* failures |
| `profile` | `"87 modules · 34 files with prior defect history"` | Depth of history available |
| `model` | `"v1.3.0 · 512 commits scored · confidence 0.71 median"` | Model version, volume, confidence |
| `insights` | `"9 hotspots · 3 alerts · health 74"` | What was produced |

Note `metrics`: "18 unparseable" and "coverage unavailable" appear in the user's
face rather than being swallowed. A pipeline that reports only its successes is
lying by omission, and the `null`-not-zero rule (§7) depends on the user being
able to see that a signal was missing.

---

## 3. Two entry points

### 3.1 Initial scan (onboarding)

Triggered by `POST /analysis/jobs/`. Bounded by `history_depth_days` (default 90)
and `MAX_INITIAL_COMMITS` (default 1,000).

```
connect   → token, access check
fetch     → repo metadata, languages, contributors, branches
history   → list_commits(since=now-90d) → upsert Commit rows
metrics   → per commit: get_commit(sha) → files + patches → analyzers
profile   → per file/module: churn, age, author count, prior-fix count
model     → score every commit in the window
insights  → hotspots + health snapshot + alerts + analytics backfill
```

The initial scan is the expensive path — roughly 520 GitHub requests for a
500-commit repository (`github-integration.md` §8). It runs on the `ingestion`
queue so it cannot starve live push analysis.

### 3.2 Incremental (push / PR webhook)

Same seven stages, drastically smaller. `connect` and `fetch` are near-free
(cached metadata, ETag `304`). `history` covers only the pushed commits.
`profile` updates only the files touched. Typical wall-clock: 5–20 seconds for a
single-commit push.

The stages are identical because the frontend polls one endpoint with one shape.
Reusing the contract is cheaper than maintaining two.

---

## 4. Stage 4 — code metrics

### 4.1 What is extracted per changed file

**Diff metrics** (language-independent, always available):
`additions`, `deletions`, `churn = additions + deletions`, `files_changed`,
`is_new_file`, `is_deleted`, `is_rename`, `hunk_count`, `max_hunk_size`,
`scattered_edits` (hunks spread across distant line ranges — a stronger defect
signal than raw line count).

**AST metrics** (Python at launch, behind a `LanguageAnalyzer` interface):
`cyclomatic_complexity` (max and mean per function), `cognitive_complexity`,
`max_nesting_depth`, `function_count`, `function_length_max`, `parameter_count_max`,
`class_count`, `import_count`, `comment_ratio`, `has_bare_except`,
`has_todo_fixme`, `long_function_count`.

**Historical metrics** (from our own database, not GitHub):
`file_churn_30d`, `file_commit_count`, `distinct_author_count`,
`days_since_last_change`, `prior_fix_commit_count`, `file_age_days`.

**Risk-relevant patterns** — deliberately shallow:
nesting > 4, functions > 80 lines, bare `except`, mutable default arguments,
`eval`/`exec` usage, missing error handling around I/O, dependency version jumps.

The brief is explicit: *"Do not attempt to build a perfect static analyzer. Focus
on features useful for the ML model."* These are features, not a linter. Nothing
here produces a "code smell" verdict shown to the user on its own.

### 4.2 Multi-language posture

Python gets AST analysis via the stdlib `ast` module. Every other language gets
diff and historical metrics only, and its AST-derived columns are **`null`** —
not zero, not a guessed default.

`LanguageAnalyzer` is the seam:

```python
class LanguageAnalyzer(Protocol):
    language: str
    extensions: tuple[str, ...]
    def analyze(self, source: str, path: str) -> FileMetrics | None: ...
```

`analyze` returning `None` (syntax error, unsupported construct, file too large)
is a normal outcome, recorded as `parse_status = "failed"` with the reason. One
unparseable file does not fail the commit, the stage, or the job.

### 4.3 Bounds

| Limit | Default | Why |
| --- | --- | --- |
| `MAX_FILE_BYTES` | 1 MiB | Minified bundles and generated files are not worth parsing |
| `MAX_FILES_PER_COMMIT` | 300 | A 4,000-file vendor drop should not stall the queue |
| `AST_TIMEOUT_SECONDS` | 5 per file | Pathological inputs exist |
| `DIFF_RETENTION_DAYS` | 30 | Honours the onboarding "not retained" promise |

Every limit that bites is recorded in the stage `detail` and on the row. A
truncated analysis is labelled truncated.

---

## 5. Stage 5 — reliability profile

Per file and per module, from our own history:

- **Churn rate** — commits and lines changed over 30/90 days.
- **Author diversity** — distinct authors; high diversity correlates with defects
  in the literature, and low diversity correlates with bus-factor risk. Both are
  features; neither is shown as a judgement about a person.
- **Fix density** — share of commits touching this file that were defect fixes
  (`ml-labeling-strategy.md` defines what counts).
- **Coupling** — files that change together. Feeds `RiskModule.dependsOn` in the
  hotspot graph.
- **Recency** — days since last change, days since last defect fix.

Module = directory, one level below the repository root or below a detected
source root (`src/`, `app/`, `lib/`, `packages/*`). Crude, and it matches how
people actually talk about their code.

---

## 6. Stage 7 — repository health

This is the formula the frontend already renders. `lib/mock/analysis.ts` fixes
the component keys, labels, and weights; the backend must produce exactly these
five components with exactly these weights, or `HealthComponent[]` will not match
what the UI expects.

### 6.1 The formula

```
health = Σ (componentScore_i × weight_i) / Σ (weight_i)      i ∈ available components
```

| `key` | `label` | `weight` |
| --- | --- | --- |
| `codeQuality` | Code quality | **0.24** |
| `testing` | Test coverage | **0.22** |
| `stability` | Stability | **0.20** |
| `security` | Security posture | **0.18** |
| `reliability` | Deployment reliability | **0.16** |

Weights sum to 1.00. Scores are integers 0–100. `health` is rounded half-up to an
integer at the end, never per component.

### 6.2 Renormalization — the rule that matters

If a component cannot be computed, it is **excluded from both the numerator and
the denominator**. It is never scored 0, never defaulted to 50, and never
silently dropped from the numerator alone (which would depress health without
saying so).

Worked example — a repository with no coverage data:

```
available: codeQuality 78 (.24), stability 65 (.20), security 82 (.18), reliability 71 (.16)
excluded:  testing — coverage unavailable (.22)

numerator   = 78(.24) + 65(.20) + 82(.18) + 71(.16) = 18.72 + 13.00 + 14.76 + 11.36 = 57.84
denominator = .24 + .20 + .18 + .16 = 0.78
health      = 57.84 / 0.78 = 74.2 → 74
```

The excluded component is still returned in `breakdown` with `score: null`, so
the UI can show "unavailable" rather than a hole. If it were scored 0, health
would be 58 — a 16-point lie caused entirely by a missing signal.

**Floor:** if fewer than three components are available, `health` is `null` and
`breakdown` carries whatever was computed. Two signals are not a health score,
and a number derived from one measurement invites more confidence than it earns.

### 6.3 What each component measures

| Component | Inputs | Unavailable when |
| --- | --- | --- |
| `codeQuality` | Complexity distribution, nesting, function length, comment ratio, duplication proxy | No file in the repository has a supported analyzer |
| `testing` | Coverage %, test-file ratio, test churn vs source churn | No coverage report **and** no recognizable test files |
| `stability` | Defect-fix density, revert rate, mean time between fixes, failed-analysis rate | Fewer than 20 commits of history |
| `security` | Dependency advisories, risky-pattern density, secret-pattern hits in diffs | Dependency manifest unreadable and no supported analyzer |
| `reliability` | Deploy/release cadence from tags, hotfix ratio, commit-size variance | No tags or releases in the window |

`trend` per component compares against the snapshot from `TimeRange` ago
(default 30 days). With no prior snapshot, `trend` is `null` — the first
measurement of anything has no direction.

### 6.4 Repository-level `risk`

Distinct from health and not its inverse. `Repository.risk` is the
**exposure-weighted mean of current file risk scores**, weighted by 30-day churn:

```
risk = Σ (fileRisk_f × churn30_f) / Σ churn30_f
```

A dangerous file nobody touches contributes little; a moderately risky file under
heavy modification contributes a lot. That is the quantity worth watching. With
no churn in the window, `risk` falls back to the unweighted mean of file risk,
and if there are no scored files it is `null`.

---

## 7. Null discipline

The single rule the whole pipeline is built around:

> **A signal we could not measure is `null`. It is never a substituted default.**

| Situation | Stored | Never |
| --- | --- | --- |
| No coverage report uploaded | `coverage_percent = null`, `coverage_available = false` | `0.0` |
| Coverage report says 0% | `coverage_percent = 0.0`, `coverage_available = true` | `null` |
| File failed to parse | AST columns `null`, `parse_status = "failed"` | Zeros |
| Language unsupported | AST columns `null`, `parse_status = "unsupported"` | Zeros |
| Commit not yet scored | `Commit.analyzed = false`, risk `null` | A placeholder score |
| No defect history | `confirmedDefect = null` (unknown) | `false` |
| Fewer than 3 health components | `health = null` | A partial average presented as whole |
| No prior snapshot | `trend = null` | `{direction: "flat", value: 0}` |

`database.md` §"Where nulls carry meaning" enumerates all twelve columns where
this applies, with the specific confusion each one prevents.

The reason is not stylistic. "Unmeasured" and "measured as zero" are different
facts about the world, and a model trained on data that conflates them learns
that missing coverage *is* zero coverage. That is a bug that silently degrades
every prediction downstream and is nearly impossible to find after the fact.

---

## 8. Orchestration

### 8.1 Celery task graph

```
initial_scan(job_id)                            queue: ingestion
  └─ chain(
       connect_stage(job_id),
       fetch_repository_stage(job_id),
       read_history_stage(job_id),
       chord(
         group(analyze_commit.s(c) for c in commits),   queue: analysis
         finalize_metrics_stage.s(job_id),
       ),
       build_profile_stage(job_id),
       run_model_stage(job_id),                          queue: ml
       generate_insights_stage(job_id),
     )
```

The chord is what makes commit analysis parallel while keeping the stage boundary
meaningful: `metrics` completes when every commit's metrics are in, not when the
first one is.

### 8.2 Retry policy

| Failure | Retries | Backoff | Terminal behaviour |
| --- | --- | --- | --- |
| GitHub 5xx / timeout | 5 | Exponential + jitter, cap 300 s | Job `failed`, `error_code = "github_unavailable"` |
| GitHub 429 / rate limit | Reschedule past `reset` | — | Not counted as a retry |
| GitHub 401 | 1 re-mint | — | Job `failed`, `github_token_expired`, connection `expired` |
| GitHub 404 | 0 | — | Repository → `monitoring: "error"` |
| Unparseable file | 0 | — | That file `null`; job continues |
| Model file missing | 0 | — | Job `failed`, `model_unavailable`. **No score is written.** |
| Database deadlock | 3 | 1 s, 2 s, 4 s | Job `failed` |

The `model_unavailable` row is the important one. When the model cannot run, the
job fails visibly. It does not fall back to a heuristic score dressed up as a
prediction — a number the user cannot distinguish from a real one is worse than
no number.

### 8.3 Idempotency

Re-running any stage is safe. `analyze_commit(sha)` on an already-analyzed commit
recomputes metrics (cheap, deterministic) and skips insertion of a
`RiskPrediction` that already exists for `(commit, model_version,
feature_version)`. Stage rows are updated in place, never appended.

### 8.4 Cancellation and staleness

A job `running` for longer than `JOB_TIMEOUT` (default 60 min) is swept to
`failed` with `error_code = "timeout"` by a periodic task. Without this, the
partial-unique index on in-flight jobs blocks every later job for that repository
— a stuck job would become a permanently stuck repository.

---

## 9. Pipeline output per commit

| Table | Written | Contains |
| --- | --- | --- |
| `commits` | Stage 3 | sha, author, message, timestamps, `analyzed` |
| `commit_files` | Stage 4 | path, language, additions/deletions, patch (30-day retention) |
| `code_metrics` | Stage 4 | one row per file per commit, AST + diff metrics, nullable |
| `feature_vectors` | Stage 6 | versioned feature array + `feature_version` |
| `risk_predictions` | Stage 6 | probability, score 0–100, level, confidence, `model_version` |
| `risk_factors` | Stage 6 | ranked contributions, normalized to ~100 |
| `recommendations` | Stage 7 | actionable text tied to the top factors |
| `file_risks` | Stage 7 | per-file risk + markers for the file viewer |
| `hotspots` | Stage 7 | repository-level aggregation |
| `health_snapshots` | Stage 7 | the five components + composite |
| `alerts` | Stage 7 | rule evaluations that fired |

### 9.1 Risk factors sum to ~100

`types/commit.ts` states it: *"Factors sum to ~100"*. SHAP values are signed and
unbounded, so the mapping is explicit:

```
contribution_i = 100 × |shap_i| / Σ|shap_j|      over the top-k factors, k = 6
```

Only positive-direction (risk-increasing) factors are shown, ranked descending.
`magnitude` carries the raw SHAP value for the UI's bar rendering; `level`
buckets it. Rounding is distributed so the displayed integers sum to exactly 100
— largest-remainder, so the top factor absorbs the residue rather than the
smallest one silently gaining a point.

### 9.2 Risk score and level

The model emits a probability in `[0, 1]`. The frontend wants an integer 0–100
and a level.

```
riskScore = round(100 × probability)

level = "critical"  if riskScore ≥ criticalRiskThreshold   (default 85)
        "high"      if riskScore ≥ highRiskThreshold       (default 70)
        "medium"    if riskScore ≥ 40
        "low"       otherwise
```

Both thresholds come from the user's `AnalysisSettings` (`types/account.ts`), so
they are per-user configuration, not constants. `medium`'s boundary at 40 is a
product default with no user control — worth revisiting once there is real usage
data, and marked here so it is not mistaken for a tuned value.

**`riskScore` is a rank, not a calibrated probability.** It is presented as
"predicted defect probability" only where calibration has actually been measured
(`ml-pipeline.md` §Evaluation). Until then the product language is *risk score*
and *relative risk*, which is what the model actually supports.

---

## 10. Performance targets

| Operation | Target | Notes |
| --- | --- | --- |
| Webhook handler | p99 < 200 ms | No GitHub call, no analysis |
| Single-commit analysis | < 20 s | Dominated by one `get_commit` round trip |
| Initial scan, 500 commits | < 10 min | Parallel across workers, rate-limit bound |
| Inference per commit | < 5 ms | Tree model, in-process |
| Dashboard summary read | < 100 ms | Denormalized rows, indexed |
| Job status poll | < 30 ms | Single row + seven stage rows |

The last two are the ones that shape the schema. If a dashboard read has to
compute anything, the design is wrong.

---

## 11. Tests (Phase 25)

| Area | Test |
| --- | --- |
| Health formula | Exact renormalization arithmetic, including the §6.2 worked example |
| Health floor | Two available components → `health is None` |
| Null discipline | Missing coverage never becomes `0.0`; real `0.0` never becomes `null` |
| Stage contract | Seven stages, correct ids/order, `detail is None` while `waiting` |
| Progress | Monotonic; never derived from elapsed time |
| Failure | Failing stage 4 leaves stages 5–7 `waiting`, job `failed` |
| Factors | Sum to exactly 100 after largest-remainder rounding |
| Thresholds | `high`/`critical` boundaries read from user settings, not constants |
| Unparseable file | Job completes; that file's AST metrics are `None` |
| Model missing | Job fails; **no `RiskPrediction` row is written** |
| Idempotency | Re-running `analyze_commit` creates no duplicate prediction |
| Timeout sweep | A 61-minute `running` job becomes `failed`, unblocking the repository |
| Determinism | Same commit + same model version + same feature version → identical output |

The determinism test and the model-missing test are the two that catch the
failure mode this whole document exists to prevent: a plausible number appearing
where a real measurement should have been.
