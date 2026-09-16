"""Health and readiness endpoints.

Two endpoints with deliberately different jobs:

* ``GET /api/v1/health/`` - **liveness**. Always ``200`` if the process can
  answer. It reports each dependency's state for a human running ``curl``, but a
  degraded dependency does not change the status code. Conflating this with
  readiness means a transient database blip restarts every web process at once.
* ``GET /api/v1/health/ready/`` - **readiness**. ``503`` when a required
  dependency is unreachable, so a load balancer stops sending traffic without
  the orchestrator killing the container.

Component states are honest rather than binary:

``ok``
    Checked and working.
``error``
    Configured, checked, and failing. ``detail`` says how.
``not_configured``
    No URL configured for it yet. Expected before Phase 6.
``unavailable``
    The client library is not installed in this environment.

``not_configured`` and ``unavailable`` are not ``error``, and none of them are
silently reported as ``ok``. Same rule as the analysis pipeline: a thing we did
not measure is not a thing we measured as fine.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import connections
from django.db.utils import OperationalError
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

#: Dependencies that must be ``ok`` for the service to be considered ready.
REQUIRED_FOR_READY = ("database",)


def check_database() -> dict[str, Any]:
    try:
        connections["default"].cursor().execute("SELECT 1")
    except OperationalError as exc:
        return {"status": "error", "detail": str(exc)[:200]}
    except Exception as exc:  # pragma: no cover - driver-specific failures
        return {"status": "error", "detail": f"{type(exc).__name__}: {str(exc)[:160]}"}
    return {"status": "ok"}


def check_redis() -> dict[str, Any]:
    url = getattr(settings, "REDIS_URL", "")
    if not url:
        return {"status": "not_configured"}
    try:
        # Imported here, not at module scope: redis is an optional dependency
        # and hoisting this would make its absence a Django startup failure.
        import redis
    except ImportError:
        return {"status": "unavailable", "detail": "redis client not installed"}
    try:
        redis.Redis.from_url(url, socket_connect_timeout=2).ping()
    except Exception as exc:
        return {"status": "error", "detail": f"{type(exc).__name__}: {str(exc)[:160]}"}
    return {"status": "ok"}


def check_celery() -> dict[str, Any]:
    if not getattr(settings, "CELERY_BROKER_URL", ""):
        return {"status": "not_configured"}
    try:
        # Same reason as check_redis: celery is optional until Phase 6, and
        # config/celery.py raises ImportError when it is not installed.
        from config.celery import app
    except ImportError:
        return {"status": "unavailable", "detail": "celery not installed"}
    try:
        replies = app.control.ping(timeout=1.0)
    except Exception as exc:
        return {"status": "error", "detail": f"{type(exc).__name__}: {str(exc)[:160]}"}
    if not replies:
        return {"status": "error", "detail": "no workers responded"}
    return {"status": "ok", "workers": len(replies)}


def check_model() -> dict[str, Any]:
    """Active ML model version.

    ``None`` before any model has been trained. This is never filled with a
    plausible-looking version string - docs/ml-pipeline.md §5.3.
    """
    return {"status": "not_configured", "version": None}


def collect() -> dict[str, dict[str, Any]]:
    return {
        "database": check_database(),
        "redis": check_redis(),
        "celery": check_celery(),
        "model": check_model(),
    }


class HealthView(APIView):
    """Liveness. Always 200 when the process can answer."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []

    def get(self, request: Request) -> Response:
        components = collect()
        return Response(
            {
                "status": "ok",
                "version": settings.REPOGUARD_VERSION,
                "database": components["database"]["status"],
                "redis": components["redis"]["status"],
                "celery": components["celery"]["status"],
                "model_version": components["model"]["version"],
                "components": components,
            }
        )


class ReadinessView(APIView):
    """Readiness. 503 when a required dependency is unreachable."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes: list = []

    def get(self, request: Request) -> Response:
        components = collect()
        ready = all(components[name]["status"] == "ok" for name in REQUIRED_FOR_READY)
        return Response(
            {
                "status": "ready" if ready else "not_ready",
                "version": settings.REPOGUARD_VERSION,
                "components": components,
            },
            status=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
