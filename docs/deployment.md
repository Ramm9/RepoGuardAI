# RepoGuard — Deployment

**Status:** Phase 0 deliverable. Compose stack lands in Phase 15.
**Verification note:** Docker is not installed in the current development
environment, so the compose files described here are authored and reviewed but
have not been executed locally. That gap is recorded rather than glossed — see
§9.

---

## 1. Runtime topology

```
                    ┌──────────────┐
                    │   Next.js    │  :3000   (already built, unchanged)
                    └──────┬───────┘
                           │ fetch, credentials: include
                    ┌──────▼───────┐
                    │ Django + DRF │  :8000   gunicorn, 3 workers
                    └──┬────────┬──┘
                       │        │
          ┌────────────▼──┐  ┌──▼──────────┐
          │ PostgreSQL 16 │  │   Redis 7   │
          └───────────────┘  └──┬───────┬──┘
                                │       │ broker + cache + rate limits
                     ┌──────────▼──┐  ┌─▼─────────────┐
                     │ Celery      │  │ Celery beat   │
                     │ worker(s)   │  │ (scheduler)   │
                     └─────────────┘  └───────────────┘
```

Five services. The worker and beat run the same image as the web process with a
different command, so there is one build artifact and no drift between what the
API validated and what the worker executes.

---

## 2. Services

| Service | Image / build | Command | Notes |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | — | Named volume, healthcheck `pg_isready` |
| `redis` | `redis:7-alpine` | `redis-server --appendonly yes` | Broker, cache, throttles, ETags |
| `web` | `./backend` | `gunicorn config.wsgi -b 0.0.0.0:8000 -w 3 -t 60` | Depends on `db`+`redis` healthy |
| `worker` | same | `celery -A config worker -Q analysis,ingestion,ml,webhooks -c 4` | Scale horizontally |
| `beat` | same | `celery -A config beat -S django` | Exactly one replica, always |
| `frontend` | `./` (optional) | `npm run dev` / `npm start` | Excluded from the default profile; most work runs it on the host |

`beat` must never be scaled past one — two schedulers means every periodic task
fires twice, including retraining and the retention sweep.

Queues are separated so a 10-minute initial scan on `ingestion` cannot delay a
live push analysis on `analysis`. `webhooks` exists for post-commit fan-out work
that must stay ahead of everything else.

---

## 3. Environment variables

`backend/.env.example` ships with names and shapes only — **no values, no
plausible-looking placeholders that could be mistaken for real credentials.**

### Required

```bash
# Django
DJANGO_SECRET_KEY=            # 50+ random chars; no default in settings
DJANGO_SETTINGS_MODULE=config.settings.local
DEBUG=True                    # False in production, asserted
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://repoguard:repoguard@db:5432/repoguard

# Redis / Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# GitHub App  — obtained from the App settings page
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=       # full PEM; \n-escaped or base64, see §3.1
GITHUB_WEBHOOK_SECRET=        # must match the App's webhook secret exactly
GITHUB_TOKEN_ENCRYPTION_KEY=  # Fernet key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# CORS / frontend
CORS_ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Optional, with defaults

```bash
HISTORY_DEPTH_DAYS=90
MAX_INITIAL_COMMITS=1000
PUSH_COMMIT_LIMIT=20
DIFF_RETENTION_DAYS=30
LABEL_MATURITY_DAYS=90
JOB_TIMEOUT_MINUTES=60
MAX_FILE_BYTES=1048576
MAX_FILES_PER_COMMIT=300
MODEL_ARTIFACT_DIR=/app/models
SENTRY_DSN=
LOG_LEVEL=INFO
```

### 3.1 The private key

A PEM contains newlines, which `.env` files handle badly. Supported forms, tried
in order: literal `\n` escapes (unescaped at load), base64 of the whole PEM, or a
path via `GITHUB_APP_PRIVATE_KEY_PATH` pointing at a mounted file. In production
the file mount is preferred — a key in an environment variable shows up in
`docker inspect`, process listings, and crash dumps.

### 3.2 Frontend variables

The frontend already has its own `.env.example`. Two values matter at cutover:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK_DATA=false      # flips the service layer to the real API
```

`USE_MOCK_DATA` defaults to `true` (`lib/api/config.ts` treats anything but the
string `"false"` as true), so the frontend keeps working against mocks until this
is explicitly set. That is the Phase 36 switch, and it is one variable.

---

## 4. First run

```bash
cp backend/.env.example backend/.env    # then fill in the GitHub App values
docker compose up -d db redis
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py createsuperuser
docker compose up -d
```

Verify:

```bash
curl -s http://localhost:8000/api/v1/health/ | jq
```

Expected:

```json
{ "status": "ok", "database": "ok", "redis": "ok", "celery": "ok",
  "version": "0.1.0", "modelVersion": null }
```

`modelVersion: null` is correct before any model is trained. It is not a
placeholder to be filled with something plausible.

---

## 5. Local development without Docker

Docker is convenient, not required. PostgreSQL and Redis are the only genuine
dependencies.

```bash
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements/local.txt
python manage.py migrate
python manage.py runserver 8000
```

```bash
celery -A config worker -l info -Q analysis,ingestion,ml,webhooks
```

```bash
celery -A config beat -l info -S django
```

Webhooks need a public URL. `webhook-flow.md` §10 covers the tunnel and the
`replay_webhook` management command; the latter needs no network at all and still
exercises real signature verification.

---

## 6. Migrations

`python manage.py migrate`, run before the new image serves traffic.

Rules that keep a deploy from breaking a running service:

1. **Migrations are forward-compatible within a release.** Add a column nullable,
   backfill, then enforce `NOT NULL` in a later migration — never all three at
   once while old code is still running.
2. **No data migration in the same file as a schema migration** on a large table.
3. **Indexes on large tables are created `CONCURRENTLY`** (`AddIndexConcurrently`,
   with `atomic = False`) so writes are not blocked.
4. **Destructive migrations are separate, reviewed, and deployed alone.**

`python manage.py makemigrations --check --dry-run` runs in CI and fails the build
when a model change has no migration — the most common way a deploy breaks.

---

## 7. Production differences

| Concern | Local | Production |
| --- | --- | --- |
| Settings | `config.settings.local` | `config.settings.production` |
| `DEBUG` | `True` | `False`, asserted at import |
| HTTPS | Off | `SECURE_SSL_REDIRECT`, HSTS preload |
| Cookies | `Secure=False` | `Secure=True`, `SameSite=Lax` |
| Static files | Django | WhiteNoise compressed manifest, or CDN |
| Database | Compose container | Managed PostgreSQL, automated backups, PITR |
| Redis | Compose container | Managed Redis, AOF, not internet-reachable |
| Secrets | `.env` file | Secret manager, injected at runtime |
| Workers | 1 | ≥ 2, scaled per queue |
| Errors | Console | Sentry, `send_default_pii=False`, scrubbing `before_send` |
| Model artifacts | Local directory | Object storage, SHA-256 verified on load |

`config/settings/production.py` asserts the presence of every required secret at
import time. A production process that starts without `GITHUB_WEBHOOK_SECRET`
would accept unsigned webhooks, so it must not start.

---

## 8. Health, readiness, observability

| Endpoint | Purpose | Checks |
| --- | --- | --- |
| `GET /api/v1/health/` | Liveness | Process responds |
| `GET /api/v1/health/ready/` | Readiness | Database, Redis, Celery ping |

Readiness gates traffic; liveness gates restarts. Conflating them means a
transient database blip restarts every web process at once.

Worth alerting on: Celery queue depth by queue, job failure rate by `error_code`,
webhook signature-failure rate, GitHub rate-limit remaining per installation, p99
API latency, worker liveness, and prediction-distribution drift
(`ml-pipeline.md` §10).

---

## 9. Backups and recovery

Daily full plus continuous WAL archiving on PostgreSQL; 30-day retention; restore
rehearsed, because an unrehearsed backup is a hypothesis.

Redis holds no durable state — broker messages, caches, throttle counters, and
cached tokens. Losing it costs in-flight queue entries; the `AnalysisJob` rows
that describe that work are in PostgreSQL, so a sweeper re-enqueues jobs stuck in
`queued`. That is why jobs are persisted before being enqueued
(`webhook-flow.md` §2.1) rather than existing only as messages.

Model artifacts live in object storage with versioning. The registry row is
useless without the artifact and the artifact is unverifiable without the row's
digest, so both are backed up together.

---

## 10. Honest status

At the time of writing:

- The compose stack is **specified, not yet built** — Phase 15.
- Docker is **not installed** in this development environment, so nothing here
  has been executed. It will be verified when the files exist and a Docker
  runtime is available, and the Phase 15 report will say plainly which commands
  were actually run and which were not.
- `npx next build` currently fails in this environment on a blocked outbound
  request to `fonts.googleapis.com` (Geist and JetBrains Mono, loaded in
  `app/layout.tsx`). It is a sandbox network restriction, not a code defect, and
  it predates any backend work. The dev server runs, degrading to a fallback
  font.

These are environmental facts, not results. They are written here so the
deployment story is not mistaken for a verified one.
