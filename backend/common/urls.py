"""Unauthenticated operational endpoints.

``/api/v1/health/``       liveness  - always 200 while the process answers
``/api/v1/health/ready/`` readiness - 503 when a required dependency is down

Both are in ``PUBLIC_ENDPOINT_ALLOWLIST``; the allow-list is asserted by a test so
that a future endpoint cannot become public by accident.
"""

from __future__ import annotations

from django.urls import path

from common.health import HealthView, ReadinessView

app_name = "common"

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("health/ready/", ReadinessView.as_view(), name="health-ready"),
]
