# RepoGuard

### Predictive Software Reliability Platform

> Predict regression risk before changes reach production.

RepoGuard is an engineering intelligence platform that connects to GitHub repositories, continuously analyzes software-development activity, and estimates the probability that a commit or pull request may introduce a defect or regression.

Instead of treating AI as a generic code-review chatbot, RepoGuard combines **Git history, code metrics, testing signals, dependency changes, repository behavior, and machine-learning predictions** into a single reliability workflow.

---

## Why RepoGuard?

Modern development teams already have code review, CI, static analysis, and AI coding assistants. The problem RepoGuard focuses on is different:

> **Can we identify risky changes before they become production problems?**

RepoGuard continuously turns repository activity into actionable reliability signals.

```text
Developer pushes code
        ↓
GitHub Webhook
        ↓
RepoGuard Ingestion
        ↓
Repository + Code Analysis
        ↓
Feature Engineering
        ↓
ML Risk Prediction
        ↓
Explainable Risk Factors
        ↓
Repository Health + Alerts
        ↓
Developer Dashboard
```

---

## Core Capabilities

- GitHub repository connection and monitoring
- Event-driven commit and pull-request ingestion
- Background analysis using Celery and Redis
- Code-change and Git-history analysis
- Code churn and complexity metrics
- Test-coverage signals when available
- Historical defect signals
- ML-based regression/defect-risk prediction
- Explainable risk factors
- File-level risk hotspots
- Repository health scoring
- Commit and pull-request risk analysis
- Reliability trends and analytics
- Configurable alerts
- REST API for the frontend
- Multi-user repository isolation
- Dockerized local development

---

# Product Flow

```text
                         ┌─────────────────────┐
                         │     Developer       │
                         │                     │
                         │ git push / PR       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       GitHub        │
                         │                     │
                         │ Repo / Commit / PR │
                         └──────────┬──────────┘
                                    │
                               Webhook Event
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Django + DRF     │
                         │    Webhook API      │
                         └──────────┬──────────┘
                                    │
                              Queue Analysis
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Redis + Celery    │
                         │  Background Jobs    │
                         └──────────┬──────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      Git/Diff Analyzer       Code Analyzer         Test Analyzer
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Feature Engineering │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    ML Risk Engine   │
                         │       XGBoost       │
                         └──────────┬──────────┘
                                    │
                             Risk + Factors
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     PostgreSQL      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Django REST API  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Next.js Frontend   │
                         │  RepoGuard Console  │
                         └─────────────────────┘
```

---

# Architecture

RepoGuard is intentionally designed as a **modular monolith with asynchronous workers**, rather than premature microservices.

### High-level architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│                         PRESENTATION                              │
│                                                                   │
│ Next.js + TypeScript + Tailwind + shadcn/ui + Motion            │
│ Recharts + Monaco Editor + TanStack Query + Zustand              │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ HTTPS / REST
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                         APPLICATION API                           │
│                                                                   │
│ Django + Django REST Framework                                    │
│ Authentication · Authorization · Repository APIs · Analytics     │
│ Commit APIs · PR APIs · Alerts · Analysis Jobs                   │
└───────────────┬───────────────────────────┬───────────────────────┘
                │                           │
                │                           │ Webhooks
                │                           ▼
                │                   ┌────────────────┐
                │                   │     GitHub     │
                │                   │ API + Webhooks │
                │                   └───────┬────────┘
                │                           │
                ▼                           ▼
       ┌─────────────────┐        ┌─────────────────────┐
       │   PostgreSQL    │        │  Celery + Redis     │
       │   Persistent DB │◄───────│  Async Processing   │
       └─────────────────┘        └──────────┬──────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │  Analysis Pipeline  │
                                  │                     │
                                  │ Git / Diff         │
                                  │ AST / Complexity   │
                                  │ Tests / Coverage   │
                                  │ History            │
                                  │ Dependencies       │
                                  └──────────┬──────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │ Feature Engineering │
                                  └──────────┬──────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │    ML Risk Engine   │
                                  │ XGBoost / sklearn   │
                                  │ SHAP (optional)     │
                                  └─────────────────────┘
```

---

# Frontend

The frontend is designed as a premium developer-tool experience rather than a generic admin dashboard.

### Frontend stack

- **Next.js** — application framework and routing
- **TypeScript** — type safety
- **Tailwind CSS** — design system and styling
- **shadcn/ui** — accessible UI primitives
- **Motion** — subtle product animations
- **Recharts** — analytics and risk visualization
- **Monaco Editor** — IDE-style code/diff experience
- **TanStack Query** — server-state management
- **Zustand** — client-side state
- **React Hook Form + Zod** — forms and validation
- **Lucide React** — consistent iconography

### Major screens

- Landing page
- Authentication
- GitHub onboarding
- Repository dashboard
- Repository health
- Commit history
- Commit risk analysis
- Pull request analysis
- Risk hotspots
- Analytics
- Alerts
- Team
- Settings

---

# Backend

### Backend stack

- **Python**
- **Django**
- **Django REST Framework**
- **PostgreSQL**
- **Celery**
- **Redis**
- **GitHub API**
- **GitHub Webhooks**

### Backend responsibilities

- Authentication and authorization
- GitHub account/repository management
- Webhook validation and ingestion
- Repository and commit synchronization
- Pull request synchronization
- Asynchronous analysis orchestration
- Metric extraction
- Risk prediction orchestration
- Repository health calculation
- Alerts and analytics
- REST API delivery

---

# Machine Learning Pipeline

RepoGuard's ML layer is designed around **structured engineering signals** rather than simply sending source code to an LLM.

## Feature categories

### Commit features

- lines added
- lines deleted
- files changed
- total churn
- change size
- commit frequency

### Code features

- cyclomatic complexity where supported
- function count
- class count
- nesting depth
- file size
- function length
- imports/dependency changes

### Repository-history features

- historical bug-fix signals
- previous reverts
- file change frequency
- number of contributors
- file age
- recent instability

### Testing features

- test coverage when available
- coverage change
- presence/absence of tests

### Dependency features

- dependency modified
- dependency count changes
- affected modules where available

---

## Example feature vector

```text
[
  lines_added,
  lines_deleted,
  files_changed,
  code_churn,
  complexity,
  test_coverage,
  historical_bug_count,
  revert_count,
  contributor_count,
  recent_change_frequency,
  dependency_changed,
  file_age,
  ...
]
```

---

# ML Prediction

The initial model strategy uses tabular models such as:

- Logistic Regression
- Random Forest
- XGBoost

The preferred production candidate is selected through evaluation rather than assumption.

### Prediction output

```json
{
  "risk_score": 78,
  "predicted_defect_probability": 0.78,
  "severity": "HIGH",
  "model_version": "v1.0.0",
  "feature_version": "v1"
}
```

RepoGuard intentionally treats predictions as **probabilistic estimates**, not guarantees.

---

# Explainability

A prediction without context is not useful to an engineer.

RepoGuard therefore stores structured risk factors such as:

```text
Code Churn              31%
Test Coverage           24%
Historical Defects      20%
Complexity              14%
Dependency Changes       7%
Other                    4%
```

Where appropriate, SHAP or other feature-attribution methods can be used to provide model-level explanations.

The UI converts these structured signals into engineering actions such as:

```text
Recommended actions

1. Add tests around payment validation.
2. Review transaction rollback behavior.
3. Re-run analysis after coverage improves.
```

Recommendations must be based on actual analysis signals and must never be fabricated.

---

# Repository Health

Repository health is distinct from risk.

**Health:** higher is better.

Example:

```text
Repository Health       82 / 100

Code Quality            84
Testing                 67
Stability               79
Security                91
Reliability             78
```

The exact health formula is documented and versioned so it can evolve without silently changing historical results.

---

# Risk Hotspots

RepoGuard identifies files or modules that repeatedly exhibit risk signals.

Example:

```text
File                    Risk
────────────────────────────────
payment_service.py       91%
checkout.py              78%
transaction.py           72%
auth.py                  43%
users.py                 17%
```

A hotspot can combine:

- historical defect signals
- code churn
- complexity
- change frequency
- test coverage
- repository instability

---

# Event-Driven Processing

The platform is designed around asynchronous, event-driven analysis.

### Push flow

```text
1. Developer pushes commit
2. GitHub sends webhook
3. Django validates webhook signature
4. RepoGuard identifies repository/event
5. AnalysisJob is created
6. Celery worker picks up job
7. Repository/commit data is fetched
8. Code metrics are calculated
9. Features are generated
10. ML inference runs
11. Risk factors are generated
12. Prediction is persisted
13. Repository health/alerts are updated
14. REST API exposes the result
15. Frontend displays the updated analysis
```

The webhook endpoint remains lightweight; expensive analysis is never performed synchronously inside the webhook request.

---

# Data Model

Core domain entities include:

```text
User
  │
  └── GitHubInstallation
          │
          └── Repository
                ├── Branch
                ├── Commit
                │     └── CommitFile
                ├── PullRequest
                │     └── PullRequestFile
                ├── CodeMetric
                ├── AnalysisJob
                ├── RiskPrediction
                ├── RiskFactor
                ├── RiskHotspot
                ├── RepositoryHealthSnapshot
                └── Alert
```

Important persisted concepts include:

- repository identity
- GitHub IDs/SHA values
- commit metadata
- changed files
- code metrics
- test metrics
- analysis status
- model version
- feature version
- risk prediction
- risk factors
- health snapshots
- alerts

Unique constraints and idempotency controls prevent duplicate GitHub events and duplicate analysis records.

---

# API Design

The REST API is organized around domain resources.

### Authentication

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

### GitHub

```text
GET  /api/github/repositories/
POST /api/github/connect/
GET  /api/github/status/
POST /api/github/webhooks/
```

### Repositories

```text
GET /api/repositories/
GET /api/repositories/{id}/
GET /api/repositories/{id}/health/
GET /api/repositories/{id}/commits/
GET /api/repositories/{id}/pull-requests/
GET /api/repositories/{id}/hotspots/
GET /api/repositories/{id}/analytics/
```

### Commits

```text
GET /api/commits/{id}/
GET /api/commits/{id}/analysis/
```

### Pull requests

```text
GET /api/pull-requests/{id}/
GET /api/pull-requests/{id}/analysis/
```

### Analysis jobs

```text
GET /api/analysis/{id}/
```

### Alerts

```text
GET  /api/alerts/
POST /api/alerts/{id}/read/
POST /api/alerts/{id}/resolve/
```

The exact contract is defined by the implementation in `docs/api-contract.md` and the frontend service layer.

---

# Security Principles

RepoGuard treats repository access and engineering data as sensitive application data.

Security requirements include:

- least-privilege GitHub access
- secure token/credential storage
- webhook signature validation
- backend authorization for every repository-scoped operation
- multi-user data isolation
- secure environment variables
- no secrets in frontend code
- no sensitive secrets in logs
- input validation
- rate limiting where appropriate
- secure HTTP configuration

### MVP GitHub permission model

The initial product is designed around **read-only repository monitoring**.

Write-back features such as automatic PR comments can be introduced later as an explicit optional permission.

---

# Idempotency

GitHub events may be delivered more than once.

RepoGuard therefore uses idempotency controls based on concepts such as:

- GitHub event IDs
- repository ID
- commit SHA
- pull request IDs
- unique database constraints
- deterministic analysis-job keys

Repeated webhook delivery must not create duplicate analysis work unnecessarily.

---

# Project Structure

A recommended backend structure:

```text
backend/
│
├── manage.py
│
├── config/
│   ├── settings/
│   ├── urls.py
│   ├── celery.py
│   ├── asgi.py
│   └── wsgi.py
│
├── apps/
│   ├── users/
│   ├── github/
│   ├── repositories/
│   ├── commits/
│   ├── pull_requests/
│   ├── analysis/
│   ├── metrics/
│   ├── risk/
│   ├── ml_engine/
│   ├── analytics/
│   └── alerts/
│
├── common/
│   ├── permissions/
│   ├── pagination/
│   ├── exceptions/
│   └── utils/
│
├── tests/
│
├── docs/
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

Frontend:

```text
frontend/
│
├── app/
├── components/
├── hooks/
├── lib/
├── services/
├── store/
├── types/
└── public/
```

---

# Local Development

## Prerequisites

- Python 3.x
- Node.js
- PostgreSQL
- Redis
- Git
- GitHub account
- Docker / Docker Compose (recommended)

## Backend setup

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env

python manage.py migrate
python manage.py createsuperuser

python manage.py runserver
```

## Start Redis

```bash
redis-server
```

## Start Celery worker

```bash
celery -A config worker --loglevel=info
```

## Frontend

```bash
cd frontend

npm install
npm run dev
```

The development application is then available through the configured frontend/backend development URLs.

---

# Docker

The recommended local architecture uses:

```text
backend
postgres
redis
celery-worker
frontend
```

Start the stack with:

```bash
docker compose up --build
```

Stop it with:

```bash
docker compose down
```

For a production deployment, use managed PostgreSQL/Redis where appropriate and separate application and worker processes.

---

# Environment Variables

Create a `.env` file using `.env.example`.

Example categories:

```env
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=
DATABASE_URL=
REDIS_URL=

GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

CORS_ALLOWED_ORIGINS=

ML_MODEL_PATH=
```

Never commit real credentials.

---

# Testing Strategy

RepoGuard should be tested at multiple levels.

### Unit tests

- feature extraction
- metric calculation
- risk classification
- serializers
- permissions
- utility functions

### Integration tests

- GitHub event ingestion
- repository synchronization
- Celery jobs
- database persistence
- REST API flows

### Security tests

- invalid webhook signatures
- unauthorized repository access
- cross-user data access
- authentication failures

### ML evaluation

Track:

- precision
- recall
- F1
- ROC-AUC
- PR-AUC
- confusion matrix

Accuracy alone should not be treated as the main model-quality metric for an imbalanced defect-prediction problem.

---

# ML Development Lifecycle

```text
Historical Repository Data
          ↓
Labeling Strategy
          ↓
Feature Engineering
          ↓
Training Dataset
          ↓
Train / Validation / Test
          ↓
Model Training
          ↓
Evaluation
          ↓
Model Versioning
          ↓
Production Inference
          ↓
Monitoring / Re-evaluation
```

Every prediction should retain enough metadata to determine which model and feature version produced it.

---

# Roadmap

## Phase 1 — Platform foundation

- [x] Premium frontend
- [ ] Django project foundation
- [ ] PostgreSQL
- [ ] Authentication
- [ ] REST API skeleton

## Phase 2 — GitHub integration

- [ ] GitHub App/OAuth
- [ ] Repository discovery
- [ ] Repository connection
- [ ] Commit synchronization
- [ ] Pull request synchronization

## Phase 3 — Event-driven analysis

- [ ] Webhook validation
- [ ] Push events
- [ ] Pull request events
- [ ] Celery
- [ ] Redis
- [ ] Analysis jobs

## Phase 4 — Engineering intelligence

- [ ] Git diff analysis
- [ ] Code metrics
- [ ] Code churn
- [ ] Complexity metrics
- [ ] Test coverage signals
- [ ] Historical defect signals
- [ ] Dependency signals

## Phase 5 — ML risk engine

- [ ] Feature pipeline
- [ ] Training dataset
- [ ] Baseline model
- [ ] XGBoost model
- [ ] Evaluation
- [ ] Model versioning
- [ ] Explainability

## Phase 6 — Product intelligence

- [ ] Repository health
- [ ] Risk hotspots
- [ ] Alerts
- [ ] Analytics
- [ ] Recommendations

## Phase 7 — Production hardening

- [ ] Full test coverage
- [ ] Security audit
- [ ] Docker
- [ ] CI/CD
- [ ] Monitoring
- [ ] Deployment
- [ ] Performance optimization

## Future

- [ ] Multi-language analysis
- [ ] Advanced dependency graph
- [ ] Optional GitHub PR comments
- [ ] Real-time WebSocket updates
- [ ] Advanced model retraining
- [ ] Team-level reliability intelligence

---

# Engineering Decisions

## Why Django?

Django provides a mature foundation for authentication, ORM, admin tooling, REST APIs, and Python-based ML integration. Keeping the backend in Python also avoids unnecessary language boundaries between web services and the ML pipeline.

## Why PostgreSQL?

RepoGuard has relational domain data with strong relationships between users, repositories, commits, files, analysis jobs, predictions, and alerts. PostgreSQL provides the consistency and indexing capabilities required for this model.

## Why Celery + Redis?

Repository analysis, GitHub API calls, code metrics, and ML inference can be expensive relative to a normal HTTP request. Background jobs keep webhook/API latency low and allow retries and job-status tracking.

## Why a modular monolith?

The project needs clear boundaries, but early microservices would introduce unnecessary operational complexity. A modular Django monolith with asynchronous workers provides a practical path from prototype to production while preserving the ability to separate services later if scale requires it.

## Why XGBoost / tabular ML?

The initial signal set is primarily structured engineering data: churn, complexity, history, coverage, change frequency, and related features. Tree-based models are a strong starting point for this kind of tabular classification problem and are easier to interpret and evaluate than jumping immediately to deep learning.

## Why not make an LLM the core model?

RepoGuard's differentiator is **predictive software reliability**, not generic code generation. The core risk score should come from measurable engineering signals. LLMs may be added later for explanations or workflow assistance, but they should not replace the underlying evidence-driven risk model.

---

# Reliability and Data Integrity Principles

RepoGuard follows these principles:

1. **Do not fabricate engineering metrics.**
2. **Distinguish unavailable data from zero values.**
3. **Store model and feature versions with predictions.**
4. **Make webhook handling idempotent.**
5. **Keep expensive analysis asynchronous.**
6. **Keep user/repository data isolated.**
7. **Make predictions probabilistic rather than deterministic claims.**
8. **Expose why a risk score was generated.**
9. **Keep the frontend API-ready and backend contracts explicit.**

---

# Example User Journey

```text
Sign Up
   ↓
Connect GitHub
   ↓
Select payment-service
   ↓
Initial Repository Analysis
   ↓
Repository Health = 82
   ↓
Developer pushes commit #284
   ↓
GitHub Webhook
   ↓
RepoGuard analysis job
   ↓
Metrics extracted
   ↓
ML prediction
   ↓
Risk = 78% HIGH
   ↓
Why?
   ├── High code churn
   ├── Low test coverage
   ├── Historical defect hotspot
   └── Increased complexity
   ↓
Recommended actions
   ├── Add payment validation tests
   └── Review rollback handling
```

---

# Example Dashboard Concept

```text
┌─────────────────────────────────────────────────────────────┐
│ REPOGUARD                                      ● MONITORING │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Repository Health                         82 / 100          │
│                                                             │
│ Current Risk        18%       High-Risk Files       12      │
│                                                             │
│ ─────────────── Risk Trend ─────────────────────────────── │
│       ╭──╮                                                 │
│   ╭───╯  ╰────╮                                            │
│───╯           ╰────────                                    │
│                                                             │
│ Latest Commit                                               │
│ #284  feat: update payment validation           78% HIGH    │
│                                                             │
│ Risk factors                                                │
│ ● Code churn       31%                                     │
│ ● Coverage         24%                                     │
│ ● History          20%                                     │
└─────────────────────────────────────────────────────────────┘
```

---

# What Makes RepoGuard Different?

RepoGuard is designed around an important distinction:

### Code assistants answer:

> "What does this code do?"

### Code review tools answer:

> "What looks wrong with this code?"

### RepoGuard aims to answer:

> **"How risky is this change in the context of this repository, and why?"**

That repository-aware context is the central product idea.

---

# Limitations

RepoGuard's predictions depend on the quality and availability of repository data.

Potential limitations include:

- incomplete historical defect labels
- missing test coverage information
- language-specific analysis coverage
- noisy commit history
- class imbalance in training data
- model drift as repositories evolve
- false positives and false negatives
- GitHub API rate limits

Predictions should therefore be treated as **engineering decision-support signals**, not guarantees.

---

# Contributing

Contributions are welcome once the project structure is stabilized.

Recommended workflow:

```bash
git checkout -b feature/<feature-name>

# make changes

pytest

# frontend checks
npm run lint
npm run build

git commit -m "feat: add <feature>"
git push origin feature/<feature-name>
```

Open a pull request with:

- problem description
- implementation details
- tests
- screenshots for UI changes
- API contract changes
- migration notes where relevant

---

# License

Add the project's chosen license here.

Example:

```text
MIT License
```

---

# Author

**Devana Sriram**

B.Tech — Computer Science & Engineering (AI/ML)

RepoGuard is a portfolio project focused on combining:

**Full-Stack Engineering + GitHub Integration + Distributed Background Processing + Machine Learning + Explainable Software Reliability Analytics**

---

## RepoGuard in one sentence

> **RepoGuard turns GitHub development activity into explainable, ML-powered software reliability signals before risky changes become production problems.**
