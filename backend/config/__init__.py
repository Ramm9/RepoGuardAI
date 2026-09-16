"""Package init.

Imports the Celery app so that ``@shared_task`` registration happens at Django
startup. The import is guarded because Celery is not installed in this
environment; ``celery_app`` is then ``None`` and every consumer reports the
dependency as ``unavailable`` rather than pretending it works.
"""

from __future__ import annotations

try:
    from .celery import app as celery_app
except ImportError:  # pragma: no cover - environment-dependent
    celery_app = None

__all__ = ("celery_app",)
