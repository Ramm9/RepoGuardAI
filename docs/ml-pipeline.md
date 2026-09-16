# RepoGuard — ML Pipeline

**Status:** Phase 0 deliverable. Implemented across Phases 10–12.
**Companions:** `ml-labeling-strategy.md` (where labels come from),
`analysis-pipeline.md` (where features come from).

---

## 1. The problem, stated honestly

Given a commit, estimate the probability that it introduces a defect.

This is **just-in-time defect prediction** — a twenty-year-old research area with
a well-understood ceiling. Published within-project results cluster around
PR-AUC 0.30–0.50 on heavily imbalanced data. Anyone claiming 95% accuracy on this
problem is reporting accuracy on a dataset that is 95% negative.

What the model can honestly do: **rank** changes by relative risk so review
attention goes where it is most likely to pay off. What it cannot do: tell you a
commit has a bug.

Product vocabulary, fixed: *risk score*, *predicted defect probability*,
*regression risk*, *model confidence*, *risk factors*, *potential regression*.
Never: "this commit is buggy", "will fail", "guaranteed".

---

## 2. Models: tabular first, deliberately

Sequence, in order of implementation:

| Stage | Model | Role |
| --- | --- | --- |
| 0 | **Heuristic baseline** | Not shipped as a prediction. The bar every model must clear. |
| 1 | **Logistic Regression** (L2, balanced) | Interpretable, fast, well-calibrated by construction. |
| 2 | **Random Forest** | Captures interactions; gives a variance-reduction comparison. |
| 3 | **XGBoost / Gradient Boosting** | Expected production model. Handles missingness natively. |
| — | Deep learning | **Not in scope.** |

Why no neural network: the feature space is ~60 tabular columns with a few
thousand training rows per repository. Gradient-boosted trees dominate that
regime, train in seconds, and explain cleanly with SHAP. A deep model would be
slower to train, harder to explain, and worse. The brief says start with strong
tabular models; the evidence says stay there until something forces otherwise.

**XGBoost handles `null` natively** by learning a default branch direction per
split. This matters more than it sounds: the pipeline produces genuine nulls
everywhere (unsupported language, unavailable coverage, no history), and being
able to feed them in *as* nulls rather than imputing is why the null discipline
in `analysis-pipeline.md` §7 costs nothing at model time.

### 2.1 The heuristic baseline

```
risk = w₁·norm(churn) + w₂·norm(files_changed) + w₃·norm(complexity_delta)
     + w₄·norm(prior_fix_density) + w₅·is_friday_evening + …
```

Its only job is to answer "does the model beat counting lines changed?" If a
trained model does not clear it on PR-AUC, the model does not ship. The baseline
is **never shown to a user as a prediction** — it has no confidence, no
calibration, and no explanation worth the name.

---

## 3. Features

~60 features in five families, versioned as a set (`feature_version`, e.g.
`fv3`). The version is stored on every prediction. Changing any feature's
definition means a new version — never a silent redefinition, or historical
predictions become uninterpretable.

**Change size** — `lines_added`, `lines_deleted`, `total_churn`, `files_changed`,
`directories_touched`, `languages_touched`, `hunk_count`, `max_hunk_size`,
`scattered_edit_ratio`, `new_file_count`, `deleted_file_count`, `rename_count`.

**Complexity** — `cyclomatic_max`, `cyclomatic_mean`, `cyclomatic_delta`,
`cognitive_max`, `nesting_depth_max`, `function_length_max`,
`function_count_delta`, `param_count_max`, `comment_ratio_delta`.

**History** — `file_churn_30d`, `file_commit_count`, `file_age_days`,
`days_since_last_change`, `prior_fix_count`, `fix_density`,
`distinct_author_count`, `author_file_experience`, `author_repo_experience`,
`author_recent_commit_count`, `coupled_file_count`.

**Testing** — `test_files_changed`, `test_to_source_ratio`, `coverage_percent`
(**nullable**), `coverage_delta` (**nullable**), `has_test_changes`,
`source_changed_without_tests`.

**Context** — `commit_hour_local`, `commit_day_of_week`, `is_weekend`,
`is_merge_commit`, `is_revert`, `message_length`, `has_issue_reference`,
`pr_review_count`, `pr_time_open_hours`, `dependency_files_changed`,
`dependency_major_bump_count`.

### 3.1 Two things that are not features

**Author identity.** `author_id` is never a feature. It would learn "this person
writes bugs", which is both a discriminatory outcome and a spurious correlation
with whoever owns the legacy module. `author_file_experience` (commits by this
author to this file) is a legitimate proxy for familiarity and *is* used.
`types/analytics.ts` says the same thing about the UI: *"Deliberately not a
developer ranking."*

**Anything computed after the fact.** No feature may use information unavailable
at commit time — including the defect label's own provenance. Leakage here is
easy to introduce (a "was later reverted" flag, a "referenced in a bug issue"
count) and produces beautiful offline metrics that collapse in production.
Guarded by an explicit test asserting every feature is derivable from data with
`created_at <= commit.committed_at`.

### 3.2 Preprocessing

Skewed counts get `log1p`. Trees are scale-invariant so no standardization is
applied for XGBoost; Logistic Regression gets a `StandardScaler` inside its
pipeline. Categoricals are one-hot (all low-cardinality by construction).
**No imputation of genuine nulls** — they are passed through to XGBoost, and for
Logistic Regression a missingness indicator column is added alongside a median
fill, so "missing" remains a distinguishable state rather than being erased.

---

## 4. Training

### 4.1 Temporal split, never random

```
|—————————— train 70% ——————————|—— val 15% ——|—— test 15% ——|
t₀                                                            now
```

A random split lets the model see future commits while predicting past ones, and
inflates every metric. The split is by `committed_at`, always, with a **gap** of
`LABEL_MATURITY_DAYS` (default 90) between train and validation so that training
labels are mature while validation labels are not yet contaminated by the same
fix window. See `ml-labeling-strategy.md` §5.

### 4.2 Class imbalance

Typical positive rate: 5–15%. Handled by `scale_pos_weight = n_neg/n_pos` for
XGBoost and `class_weight="balanced"` for the linear and forest models. **Not** by
SMOTE — synthesizing fake commits to train a model that judges real ones adds
noise without adding information, and the interaction with temporal splitting is
unpleasant.

Threshold selection is separate from training: the operating point is chosen on
the validation set for the precision the product needs, not left at 0.5.

### 4.3 Global then per-repository

Training starts **global** — one model over all repositories. A new repository
with 40 commits cannot train anything, and cold-start matters more than the last
few points of accuracy.

Per-repository fine-tuning is enabled only when a repository has
`MIN_REPO_TRAINING_COMMITS` (default 500) **and** at least 50 positive labels.
Below that, the global model is used and `RiskPrediction.model_version` records
which — so it is always visible which model produced a given number.

### 4.4 Retraining

Weekly on the `periodic` queue, plus on demand. A newly trained model is
**staged, not activated**. It is promoted only if it beats the active model on
the held-out test set by more than a noise margin (PR-AUC +0.02). The
`ModelVersion` table's partial unique index `UNIQUE (is_active) WHERE is_active`
guarantees exactly one active model at a time; promotion is a transaction.

Every model version stores its training-set size, positive rate, date range,
feature version, hyperparameters, and full evaluation metrics. A model whose
provenance is unknown cannot be debugged.

---

## 5. Evaluation

### 5.1 Metrics — PR-AUC first, accuracy never headline

| Metric | Why |
| --- | --- |
| **PR-AUC** | Primary. The right summary under heavy imbalance. |
| **ROC-AUC** | Secondary; comparable across literature, optimistic under imbalance. |
| **Precision @ k** | The real product metric: of the top 10% riskiest, how many are defects? |
| **Recall @ k** | Coverage at the same operating point. |
| **Brier score** | Probability quality, not just ranking. |
| **ECE / reliability curve** | Calibration — see §5.2. |
| Accuracy | Recorded, never headlined. 90% accuracy on a 10% positive rate is "predict no". |

### 5.2 Calibration is a claim that must be earned

The brief is explicit: *do not claim that a probability is perfectly calibrated
unless calibration has actually been evaluated.*

So: calibration is measured (expected calibration error over 10 bins, plus a
reliability curve) and stored on `ModelVersion`. Until it is measured *and*
within tolerance (ECE < 0.05), the output is presented as a **risk score**, not
as a probability of failure, and no product copy says "there is an X% chance this
commit has a bug."

If calibration is poor, the remedy is isotonic regression or Platt scaling fitted
on the validation set — recorded as part of the model version, because a
calibrated model is a different model.

`RiskPrediction.confidence` is **not** the probability. It is a separate quantity
derived from prediction-margin distance and the volume of history backing the
features, on `[0, 1]`. A commit in a file with no history gets low confidence
whatever its score. The frontend renders them separately (`CommitAnalysis` has
both `riskScore` and `confidence`) precisely because they answer different
questions.

### 5.3 No fabricated metrics

Until a model has actually been trained and evaluated on real data, every metric
field is `null` and the UI shows "model not yet evaluated". There is no seeded
accuracy, no placeholder AUC, no aspirational number in a fixture that could be
mistaken for a result. The brief forbids fabricating ML accuracy, and the only
robust way to obey that is to have no code path that can produce a metric
without a training run behind it.

---

## 6. Inference

```
commit → build feature vector (feature_version)
       → validate schema (order, dtypes, ranges)
       → model.predict_proba()[1]
       → probability
       → riskScore = round(100 × p), level by user thresholds
       → SHAP → ranked factors → recommendations
       → persist RiskPrediction + RiskFactor rows
```

In-process. The model loads once per Celery worker (lazy, cached at module
level), scoring takes single-digit milliseconds, and there is no model-server
hop to fail. `analysis-pipeline.md` §8 covers the surrounding orchestration.

**Feature-schema validation is mandatory** before every prediction: exact column
order, expected dtypes, and a check that `feature_version` matches the model's.
A silently reordered feature vector produces confident nonsense — the single most
dangerous failure mode in the pipeline, and the one that leaves no trace in logs.

If the model artifact is missing or fails to load, inference raises at worker
start and the job fails with `model_unavailable`. **No fallback score is
written.** A heuristic number in the `RiskPrediction` table is indistinguishable
from a model's, forever.

---

## 7. Explainability

SHAP `TreeExplainer` for tree models (exact, fast), `LinearExplainer` for
Logistic Regression.

```
shap_values → keep risk-increasing contributions
            → top 6
            → contribution_i = 100 × |shap_i| / Σ|shap_j|
            → largest-remainder rounding to integers summing to exactly 100
            → map feature name → human label + description
```

Feature-to-label mapping is a maintained table, not a string transformation:

| Feature | `label` | `description` |
| --- | --- | --- |
| `total_churn` | Change size | "This change touches significantly more lines than the repository median." |
| `prior_fix_count` | Prior defect history | "Files in this change have been fixed N times previously." |
| `cyclomatic_delta` | Complexity increase | "Cyclomatic complexity rose by N in the modified functions." |
| `source_changed_without_tests` | No test changes | "Source files changed with no corresponding test changes." |
| `distinct_author_count` | Many contributors | "These files are modified by an unusually large number of people." |
| `coverage_delta` | Coverage decrease | "Test coverage decreased in the affected files." |

Descriptions state what was measured. They do not assert consequence — "coverage
decreased" is a fact; "this will cause a bug" is not one we possess.

`Recommendation` rows derive from the top factors through an explicit rule table
("no test changes + high churn → suggest adding tests for the changed paths"),
not from the model. The model ranks risk; it does not know what to do about it,
and pretending otherwise would be generating advice from a number.

---

## 8. Model registry

`ModelVersion` (`database.md`) stores: semantic version, algorithm,
`feature_version`, hyperparameters, training-set size and date range, positive
rate, every evaluation metric from §5.1, calibration status and ECE, artifact
path and SHA-256, `trained_at`, `is_active`.

Artifacts are joblib files under `MODEL_ARTIFACT_DIR` (object storage in
production), verified by digest at load. A model whose digest does not match its
record does not load — silently serving a swapped artifact is worse than an
outage.

Rollback is setting `is_active` on a previous row. Because every prediction
carries `model_version`, the effect of a rollback on historical numbers is
inspectable rather than mysterious.

---

## 9. Cold start

A repository with no analyzed history still needs to show something honest.

| Available history | Behaviour |
| --- | --- |
| 0 commits analyzed | No predictions. `Commit.analyzed = false`, risk `null`. UI shows "analysis pending". |
| 1–49 commits | Global model, `confidence` scaled down by history volume. |
| 50–499 | Global model, normal confidence. |
| ≥ 500 with ≥ 50 positives | Per-repository model eligible. |

At no point is a score invented to fill a dashboard. An empty state is a true
statement about a new repository; a fabricated 42 is not.

---

## 10. Monitoring after deployment

- **Prediction distribution drift** — mean and quantiles of emitted scores per
  week. A sudden shift usually means a feature broke, not that the code got
  riskier.
- **Feature drift** — population stability index per feature against the training
  distribution.
- **Label feedback** — as SZZ labels mature (`ml-labeling-strategy.md`),
  retrospective PR-AUC is computed on commits scored 90+ days ago. This is the
  only metric measured on genuinely production data.
- **Null rate per feature** — a jump means an upstream analyzer is failing
  quietly.

All four are recorded; none of them auto-retrain. Automatic promotion on a drift
signal is how a bad model reaches production at 3am.

---

## 11. Tests (Phase 25)

| Area | Test |
| --- | --- |
| Leakage | Every feature derivable from data at or before `committed_at` |
| Temporal split | No validation commit predates any training commit; gap respected |
| Feature schema | Wrong order or dtype raises before `predict_proba` |
| Feature version | Model with `fv2` refuses an `fv3` vector |
| Nulls | Genuine nulls reach XGBoost unimputed; LR gets indicator + fill |
| Determinism | Same vector + same model → identical probability, factors, ordering |
| Factors | Sum to exactly 100; only risk-increasing; ≤ 6 |
| Calibration claim | `calibrated = True` impossible unless ECE was computed |
| Baseline gate | Promotion refused when PR-AUC ≤ baseline |
| Missing artifact | Job fails; **no `RiskPrediction` row written** |
| Digest mismatch | Artifact refuses to load |
| Author fairness | `author_id` absent from the feature matrix |
| Cold start | Repository with 0 commits yields no predictions, not zeros |
| Registry | Exactly one `is_active` model enforceable under concurrent promotion |
