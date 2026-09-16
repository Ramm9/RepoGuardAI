"""Health and readiness endpoints.

The distinction under test: liveness never fails on a degraded dependency,
readiness does. Conflating them means one slow database restarts every web
process at once.

The second property under test is honesty. A dependency that was never
configured, or whose client library is absent, reports ``not_configured`` /
``unavailable`` - not ``ok``, and not ``error``. Same rule the analysis pipeline
applies to a missing signal: not measured is not the same as measured fine.
"""

from __future__ import annotations

from unittest import mock

from django.test import TestCase
from rest_framework import status

from common import health


class HealthEndpointTests(TestCase):
    url = "/api/v1/health/"

    def test_anonymous_access_allowed(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reports_version_and_components(self):
        body = self.client.get(self.url).json()

        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["version"], "0.1.0")
        self.assertEqual(body["database"], "ok")
        self.assertEqual(set(body["components"]), {"database", "redis", "celery", "model"})

    def test_keys_are_camel_cased_but_values_are_not(self):
        body = self.client.get(self.url).json()

        self.assertIn("modelVersion", body)
        self.assertNotIn("model_version", body)
        # The *value* keeps its underscores - the frontend compares it literally.
        self.assertEqual(body["components"]["redis"]["status"], "not_configured")

    def test_model_version_is_null_not_a_plausible_string(self):
        # docs/ml-pipeline.md §5.3: no model has been trained, so there is no
        # version. Inventing "v1" here is the exact failure this test exists for.
        self.assertIsNone(self.client.get(self.url).json()["modelVersion"])

    def test_liveness_stays_200_when_a_dependency_is_down(self):
        with mock.patch.object(
            health, "check_database", return_value={"status": "error", "detail": "down"}
        ):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["database"], "error")


class ReadinessEndpointTests(TestCase):
    url = "/api/v1/health/ready/"

    def test_ready_when_database_reachable(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "ready")

    def test_not_ready_when_database_down(self):
        with mock.patch.object(
            health, "check_database", return_value={"status": "error", "detail": "down"}
        ):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "not_ready")

    def test_degraded_optional_dependency_does_not_block_readiness(self):
        # Celery is not installed in this environment, so its component reports
        # `unavailable`. Readiness must not require it, or nothing is ever ready
        # before Phase 6 - and after Phase 6 a worker outage would take the web
        # tier out of the load balancer along with it.
        body = self.client.get(self.url).json()

        self.assertEqual(body["status"], "ready")
        self.assertNotEqual(body["components"]["celery"]["status"], "ok")

    def test_optional_dependencies_are_never_reported_as_ok_untested(self):
        # The failure this guards: a component that was never reached being
        # rendered `ok` because the check silently swallowed its own ImportError.
        components = self.client.get(self.url).json()["components"]

        for name in ("redis", "celery"):
            with self.subTest(component=name):
                self.assertIn(
                    components[name]["status"],
                    {"ok", "error", "not_configured", "unavailable"},
                )
                self.assertNotEqual(components[name]["status"], "ok")


class ComponentCheckTests(TestCase):
    def test_database_ok(self):
        self.assertEqual(health.check_database()["status"], "ok")

    def test_redis_unconfigured_is_not_an_error(self):
        with self.settings(REDIS_URL=""):
            self.assertEqual(health.check_redis(), {"status": "not_configured"})

    def test_redis_configured_but_library_absent_is_unavailable(self):
        with self.settings(REDIS_URL="redis://localhost:6379/0"):
            with mock.patch.dict("sys.modules", {"redis": None}):
                result = health.check_redis()

        # Distinguishable from "error": nothing was measured, so nothing failed.
        self.assertEqual(result["status"], "unavailable")

    def test_celery_unconfigured_is_not_an_error(self):
        with self.settings(CELERY_BROKER_URL=""):
            self.assertEqual(health.check_celery(), {"status": "not_configured"})

    def test_model_version_is_none(self):
        self.assertEqual(health.check_model(), {"status": "not_configured", "version": None})

    def test_required_for_ready_is_minimal(self):
        # Widening this set is a deliberate act, not a drive-by edit.
        self.assertEqual(health.REQUIRED_FOR_READY, ("database",))
