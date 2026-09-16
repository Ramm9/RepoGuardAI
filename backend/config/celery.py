"""Celery application.

Import-guarded on purpose. Celery is not installed in this environment (PyPI is
unreachable from the sandbox - see the Phase 1 report), and Phase 1 must still
boot, migrate, and serve ``/api/v1/health/``. Rather than stub Celery out with a
fake that would later be mistaken for the real thing, the import failure is
caught exactly once - in ``config/__init__.py`` - and every consumer either
imports lazily or reports ``unavailable`` (``common.health.check_celery``).

When Celery is installed this module behaves like any ordinary Celery app: it is
imported at Django startup so that ``@shared_task`` registration works.
"""

from __future__ import annotations

import os

# An ImportError here is caught by config/__init__.py - celery is an optional
# dependency until Phase 6, and its absence must not stop Django from starting.
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

app = Celery("repoguard")

# All Celery settings live in Django settings under the CELERY_ prefix, so there
# is one configuration source rather than two that can disagree.
app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()

# Queue separation, from docs/deployment.md §2. Long repository ingestion must
# not sit in front of a two-second webhook fan-out, and model training must not
# sit in front of either.
app.conf.task_routes = {
    "analysis.tasks.ingest_*": {"queue": "ingestion"},
    "analysis.tasks.*": {"queue": "analysis"},
    "ml_engine.tasks.train_*": {"queue": "training"},
    "ml_engine.tasks.*": {"queue": "analysis"},
    "github.tasks.*": {"queue": "webhooks"},
}

# A task that outlives its timeout is killed rather than left holding a worker
# slot. JOB_TIMEOUT_MINUTES is the product-visible number the UI shows on a
# stalled job, so the two are derived from the same setting.
app.conf.task_soft_time_limit = 60 * int(os.environ.get("JOB_TIMEOUT_MINUTES", "60"))
app.conf.task_time_limit = app.conf.task_soft_time_limit + 120


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> str:  # pragma: no cover - operational helper
    """Confirms a worker is consuming from the default queue."""
    return f"ok:{self.request.id}"
