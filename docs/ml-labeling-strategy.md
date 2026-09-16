# RepoGuard — ML Labeling Strategy

**Status:** Phase 0 deliverable. Implemented in Phase 9.
**Companion:** `ml-pipeline.md` (what consumes these labels).

Everything in the ML pipeline rests on one question: **how do we know a commit
introduced a defect?** Get this wrong and no amount of model tuning matters —
the model will faithfully learn whatever the labels actually encode, which may
not be defects at all.

---

## 1. Ground truth does not exist

There is no oracle. A commit "introduced a defect" only if a defect was later
found, attributed, and fixed — and all three of those are social processes, not
facts about the code. So the labels are **inferred, noisy, and incomplete**, and
the system is built to say so.

Three consequences that shape every design decision below:

1. A negative label means "no fix has been linked to this commit *yet*" — not
   "this commit is correct".
2. Labels get better with time. A commit from last week is not yet labellable.
3. Label noise has a floor. Published SZZ evaluations report substantial false
   positives and negatives; treating labels as clean produces evaluation numbers
   that are themselves wrong.

`Commit.confirmedDefect` is therefore **three-valued**: `true`, `false`, `null`.
`null` means unknown, and it is the default. The frontend type already allows it
(`confirmedDefect?: boolean` in `types/commit.ts`).

---

## 2. SZZ, in outline

The standard approach (Śliwerski–Zimmermann–Zeller). Two steps:

```
Step 1 — identify FIX commits
         a commit that repairs a defect

Step 2 — blame backwards
         for each line the fix modified or deleted,
         find the commit that last touched that line;
         those are the INDUCING commits  → label positive
```

RepoGuard implements SZZ with the standard noise filters, and stores enough
provenance that any label can be traced back to the fix that produced it.

---

## 3. Step 1 — identifying fix commits

Evidence is tiered. **Tier is stored**, so a model can weight labels by evidence
quality and an analyst can see why a commit was called a fix.

| Tier | Evidence | Confidence |
| --- | --- | --- |
| **A** | Linked closing issue labelled `bug`/`defect`/`regression` (`Fixes #123`, `Closes #123`) | High |
| **B** | Explicit revert (`Revert "…"`, or a diff that inverts a prior commit) | High |
| **C** | Message matches the fix lexicon **and** touches source (not docs/config/tests only) | Medium |
| **D** | PR titled or labelled as a fix, merged | Medium |
| — | Message matches lexicon but touches only docs, comments, formatting, or version bumps | **Rejected** |

### 3.1 The lexicon

```
fix, fixes, fixed, fixing, bug, bugfix, defect, issue, error,
crash, fault, fail, failure, regression, broken, break,
resolve, resolves, correct, patch, repair, hotfix
```

Matched word-boundary, case-insensitive, on the **first line** of the message
(the summary). Bodies contain changelogs and quoted text; matching them inflates
the fix set substantially.

### 3.2 Exclusions — where naïve keyword matching goes wrong

Rejected even on a lexicon hit:

- **Feature work phrased as fixing:** "fix up the new onboarding copy",
  "fix formatting", "fix typo", "fix lint", "fix imports".
- **Merge commits.** A merge carries the messages of everything beneath it.
- **Dependency bumps.** "fix: bump lodash to 4.17.21" is a dependency update;
  it may be a *security* fix, which is tracked separately, but it did not repair
  our code.
- **Docs/comments/whitespace only.** No source file changed → not a code defect fix.
- **Generated/vendored paths** (`vendor/`, `node_modules/`, `dist/`, `*.lock`,
  `*.min.js`, `*_pb2.py`, `migrations/`). Configurable per repository.
- **Very large commits** (> `FIX_MAX_FILES`, default 50). A 200-file commit
  labelled a fix would blame half the repository.

Every rejection is recorded with its reason. The set of things we decided *not*
to call a fix is as inspectable as the set we did.

---

## 4. Step 2 — blaming backwards

For each fix commit:

```
for file in fix.modified_files:            # deleted/modified lines only
    for line in file.deleted_or_modified_lines:
        candidate = git_blame(file, line, before=fix.sha)
        if passes_filters(candidate, fix):
            label candidate positive, provenance = (fix.sha, file, line, tier)
```

**Only deleted and modified lines are blamed.** Pure additions have no prior
author — blaming the line above an insertion is a well-known SZZ error that
attributes defects essentially at random.

### 4.1 Filters on candidates

| Filter | Rule | Why |
| --- | --- | --- |
| Temporal | `candidate.committed_at < fix.committed_at` | A commit cannot induce its own fix |
| Window | Gap ≤ `SZZ_MAX_GAP_DAYS` (default 365) | A 5-year-old line is dormant design, not an induced defect |
| Cosmetic | Skip if the candidate only reformatted the line | Whitespace commits absorb blame that belongs earlier |
| Self-fix | Allowed, but flagged | "Fix my own typo 10 minutes later" is real but weak signal |
| Vendored | Skip generated/vendored paths | Not our defects |
| Fan-out | Cap at `SZZ_MAX_INDUCING` (default 10) per fix | One refactor-touching fix should not label 300 commits |

When the fan-out cap trips, the fix is recorded as `blame_truncated = true` and
contributes no labels rather than a biased subset — an arbitrary top-10 would be
a sampling artefact masquerading as evidence.

### 4.2 Blame without a working tree

We do not clone repositories. Blame is computed from **our own stored commit
history**: `CommitFile` rows carry per-file patches for `DIFF_RETENTION_DAYS`,
and a per-file line-provenance map is maintained incrementally as commits are
ingested, so line attribution survives patch expiry.

Where provenance is unavailable (commits older than our history window, a
repository connected after the fact), the label is `null` — unknown — and the fix
is recorded as `blame_unavailable`. It is not guessed.

---

## 5. Label maturity — the gap that prevents self-deception

A commit from yesterday has had no time to reveal a defect. Labelling it negative
and training on it teaches the model that recent commits are safe.

```
|——————— labellable ———————|—— maturity gap ——|
t₀                     now − 90d              now
    labels usable            labels immature, EXCLUDED from training
```

`LABEL_MATURITY_DAYS` defaults to 90. Commits newer than that are excluded from
training entirely — neither positive nor negative. They are still *scored*
(that's the product), just not learned from.

Labels are also **recomputed**, not frozen. A nightly job re-runs SZZ over the
recent fix window, so a commit labelled `null` in March can become `true` in
June. `RiskPrediction` rows are not rewritten when this happens; the label change
is what makes retrospective evaluation (`ml-pipeline.md` §10) meaningful.

---

## 6. What a negative label means

Explicitly: **`false` means "no linked fix found, and the maturity window has
passed"**. It does not mean the commit is defect-free. Latent defects, unreported
defects, and defects fixed without a traceable link are all silently negative.

This is why the product never says "this commit is safe". The model's low scores
mean *lower relative risk*, which is the strongest claim the data supports.

Three-valued in storage:

| Value | Meaning |
| --- | --- |
| `true` | SZZ linked at least one fix to this commit |
| `false` | Mature, analyzed, no fix linked |
| `null` | Too recent, blame unavailable, or repository history too shallow |

`null` rows are excluded from training and from every reported metric. They are
not quietly folded into the negative class, which would be the single easiest way
to make the model look better than it is.

---

## 7. Storage and provenance

```
DefectLabel
  commit_id            FK, unique with label_version
  label                bool | null
  label_version        e.g. "szz-v1"      -- algorithm version, like feature_version
  evidence_tier        A | B | C | D | null
  fix_commit_ids       uuid[]             -- the fixes that produced this label
  inducing_lines       jsonb              -- {file: [line, …]} for audit
  blame_truncated      bool
  blame_unavailable    bool
  computed_at          timestamptz
  is_mature            bool               -- committed_at < now - LABEL_MATURITY_DAYS
```

`label_version` exists for the same reason `feature_version` does: when the SZZ
filters change, the labels change, and a model trained on `szz-v1` must not be
evaluated against `szz-v2` labels without that being visible.

`inducing_lines` is what makes a label auditable. "Why is this commit positive?"
has a concrete answer: this fix, this file, these lines.

---

## 8. Weak and auxiliary signals

Not labels, but stored and available as features or as secondary targets:

| Signal | Source | Use |
| --- | --- | --- |
| Reverted | A later commit reverts this one | Strong weak-positive; Tier B evidence |
| Hotfix | Fix merged directly to a release branch | Weak positive |
| Post-merge fix velocity | A fix to the same files within 48h | Weak positive |
| Rollback | Deployment rolled back (if a CI signal exists) | Weak positive, usually unavailable |
| Security advisory | Dependency CVE | Tracked separately; **not** a code-defect label |

Weak signals are never mixed into the primary label silently. If they are used
(e.g. positive-unlabelled learning in a later phase), that is a different
`label_version`.

---

## 9. Honest limitations

Stated here, and surfaced in the UI wherever model quality is discussed:

1. **SZZ is noisy.** Independent evaluations report meaningful false-positive and
   false-negative rates. Our metrics inherit that noise, and a PR-AUC of 0.42 on
   noisy labels is not the same claim as 0.42 on clean ones.
2. **Only fixed defects are visible.** Defects nobody found are negatives.
3. **Message-quality bias.** Repositories with disciplined commit messages and
   issue links produce better labels — so model quality varies by repository
   culture, not only by code.
4. **Refactor blame.** Large refactors sit between the original defect and its
   fix and absorb blame that belongs to the original author. The cosmetic filter
   reduces this; it does not eliminate it.
5. **Shallow history.** A repository connected with a 90-day window has 90 days
   of labels. Early predictions lean on the global model, and say so through
   lower `confidence`.
6. **We do not have test-failure or production-incident data.** Those would be
   far stronger labels. Until an integration exists, they are absent, not
   approximated.

None of these is a reason not to build the system. All of them are reasons the
product language is *risk*, and never *certainty*.

---

## 10. Tests (Phase 25)

| Area | Test |
| --- | --- |
| Lexicon | "fix typo in README" → not a fix; "fix null deref in parser" → Tier C |
| Exclusions | Merge commits, dependency bumps, docs-only changes rejected |
| Tiering | `Fixes #12` on a `bug`-labelled issue → Tier A |
| Blame direction | Only deleted/modified lines blamed; pure additions blame nothing |
| Temporal | A candidate committed after the fix is never labelled |
| Window | A candidate 400 days prior is excluded at default settings |
| Fan-out | 300-candidate fix sets `blame_truncated`, emits **zero** labels |
| Maturity | A 30-day-old commit is `null` and absent from the training set |
| Three-valued | `null` never counted as negative in training or metrics |
| Recompute | A `null` label becomes `true` when a linked fix lands later |
| Provenance | Every positive label names the fix, file, and lines that produced it |
| Versioning | `szz-v2` labels are not silently compared against `szz-v1` models |
