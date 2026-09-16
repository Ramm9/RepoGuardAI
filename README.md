# RepoGuard

**Predictive software reliability for GitHub repositories.**

RepoGuard watches the commits and pull requests landing in your repositories and
answers one question about each change:

> How likely is this change to introduce a defect or regression?

The answer is a **risk score with an explanation** — which factors drove it, how
confident the model is, and what to look at. It is probabilistic and it is
ranked. RepoGuard does not tell you a commit has a bug, and no part of this
system is allowed to claim that it can.

**Access is read-only.** The GitHub App requests `contents:read`,
`metadata:read`, and `pull_requests:read`. It cannot push, cannot modify a
branch, and cannot change repository settings.

---

## Status

| Part | State |
| --- | --- |
| Frontend (Next.js 15, React 19, TypeScript) | **Complete.** Runs against a mock service layer. |
| Backend design (Phase 0) | **Complete.** Eleven documents in `docs/`. |
| Backend implementation | **Not started.** Phase 1 begins after this document. |

The frontend is the source of truth for every API contract. The backend is
derived from what the frontend actually requests — not from a specification
written alongside it. Where the two disagreed, `docs/api-contract.md` §9 records
the conflict and which side won.

---

## Architecture in one picture

```
GitHub ──webhook──▶ Django  ──validate, dedupe, enqueue──▶  202 in <200 ms
                      │
                    Redis
                      │
                 Celery worker
                      │  fetch commit & diff (installation token)
                      │  extract metrics (AST, churn, history, coverage)
                      │  build versioned feature vector
                      │  score with gradient-boosted model
                      │  explain with SHAP → ranked risk factors
                      ▼
                 PostgreSQL ──▶ DRF API ──▶ Next.js frontend
```

Django modular monolith, PostgreSQL 16, Redis, Celery, scikit-learn/XGBoost.
Not microservices — one database, one consistency domain, one deploy cadence.
The only component that needs independent scale is analysis, and Celery already
provides that seam.

Full reasoning: [`docs/architecture.md`](docs/architecture.md).

---

## Documentation

Read in this order.

| Document | What it settles |
| --- | --- |
| [`docs/api-contract.md`](docs/api-contract.md) | Every endpoint, derived from the frontend. Marks each claim OBSERVED or PROJECTED. |
| [`docs/architecture.md`](docs/architecture.md) | Layers, app boundaries, key decisions, failure posture |
| [`docs/database.md`](docs/database.md) | 20 tables, indexes, constraints, and where `null` carries meaning |
| [`docs/github-integration.md`](docs/github-integration.md) | GitHub App, least-privilege permissions, token chain, rate limits |
| [`docs/webhook-flow.md`](docs/webhook-flow.md) | Signature verification, idempotency, event handling |
| [`docs/analysis-pipeline.md`](docs/analysis-pipeline.md) | The seven stages, the health formula, null discipline |
| [`docs/ml-pipeline.md`](docs/ml-pipeline.md) | Features, training, evaluation, explainability |
| [`docs/ml-labeling-strategy.md`](docs/ml-labeling-strategy.md) | SZZ defect labelling and its honest limitations |
| [`docs/security.md`](docs/security.md) | Auth, isolation, secrets, CSRF trade-off, residual risks |
| [`docs/deployment.md`](docs/deployment.md) | Compose stack, environment variables, production differences |

---

## Principles this codebase is held to

**A missing signal is `null`, never a substituted default.**
Unknown coverage is not 0%. An unparseable file's complexity is not 0. A
repository with no history has no health score. "Unmeasured" and "measured as
zero" are different facts, and conflating them corrupts every model trained on
the result. `docs/analysis-pipeline.md` §7 enumerates every case.

**Nothing is fabricated.**
No seeded accuracy, no placeholder AUC, no demo risk scores rendered as real
ones. If the model cannot run, the job fails visibly rather than emitting a
heuristic number that nobody can later distinguish from a prediction.

**Probabilistic language only.**
Risk score, predicted defect probability, regression risk, model confidence,
risk factors. A probability is called calibrated only where calibration has been
measured and recorded on the model version.

**Authorization is a `WHERE` clause.**
Every scoped queryset is filtered by owner before anything is loaded, so another
tenant's row is never fetched, serialized, counted, or logged. Foreign ids return
`404`, not `403` — a `403` confirms the id exists.

**Secrets never cross the boundary.**
GitHub tokens, the App private key, webhook secrets, and database credentials
stay server-side. The frontend receives a connection status object and nothing
else. There is no code path that returns a token, because there is no code path
that is allowed to.

---

## Running the frontend today

```bash
npm install
npm run dev
```

It runs against the mock service layer (`lib/mock/`), which is the default —
`NEXT_PUBLIC_USE_MOCK_DATA` is treated as true unless it is literally `"false"`.
Set it to `false` once the backend is running to switch the same service layer
onto the real API. That switch is Phase 36 and it is one environment variable,
by design.

> **Known issue, pre-existing:** `npx next build` fails in a sandboxed
> environment because `app/layout.tsx` fetches the Geist and JetBrains Mono
> fonts from `fonts.googleapis.com` at build time. It is a network restriction,
> not a code defect. `npm run dev` works and falls back to a system font.

## Running the backend

Not yet — the backend does not exist. [`docs/deployment.md`](docs/deployment.md)
specifies the compose stack, every environment variable, and the first-run
sequence that Phase 15 will deliver.

---

## Build order

Design is complete (Phase 0). Implementation proceeds in dependency order, and
the first goal is a working pipeline end to end — **GitHub → webhook → job →
database → API** — before any intelligence is layered on top.

| Phases | Milestone |
| --- | --- |
| 1–3 | Django foundation, models, authentication |
| 4–6 | GitHub App, webhooks, Celery |
| 7–9 | Ingestion, code analysis, coverage and defect signals |
| 10–12 | Feature engineering, ML risk engine, explainability |
| 13–15 | Hotspots, health, alerts |
| 16–22 | Analytics, full REST API, error contract |
| 23–28 | Security, isolation, caching, logging, tests, idempotency |
| 29 | **First end-to-end milestone:** a real commit produces a real score |
| 30–38 | Frontend cutover, Docker, OpenAPI, acceptance |

Each phase reports what was implemented, files changed, endpoints added, models
added, tests added, environment variables required, how to run it, what remains,
decisions made, and known limitations. "Backend completed" is not a report.
