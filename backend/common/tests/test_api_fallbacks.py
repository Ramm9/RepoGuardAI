"""The error contract for requests that never reach a DRF view.

This module exists because a real defect got past the 109 tests that preceded
it: ``GET /api/v1/nope/`` returned ``text/html``. Every error test until now
went through a DRF view, so nothing exercised the path where URL resolution
fails outright - which is exactly the case the frontend hits on a typo, a stale
build, or an endpoint whose phase has not landed.

The contract under test: **every** response under ``/api/`` is JSON carrying
``detail`` and a ``code`` from :data:`common.exceptions.CODES`, regardless of
how the request failed.
"""

from __future__ import annotations

import json

from django.test import Client, RequestFactory, SimpleTestCase, override_settings
from rest_framework import status

from common.exceptions import CODES
from common.views import bad_request, csrf_failure, permission_denied, server_error


def body_of(response) -> dict:
    """Decode a raw ``JsonResponse``.

    The views below are called directly rather than through the test client, so
    there is no ``response.json()`` helper - that one belongs to the client.
    Calling them directly is the point: it is the only way to exercise
    ``handler400``/``403``/``500``, which Django invokes internally.
    """
    return json.loads(response.content)


class UnroutedApiPathTests(SimpleTestCase):
    def test_unrouted_api_path_is_json_not_html(self):
        response = self.client.get("/api/v1/nope/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response["Content-Type"], "application/json")

    def test_body_matches_the_error_contract(self):
        body = self.client.get("/api/v1/nope/").json()

        self.assertEqual(body["code"], "not_found")
        self.assertIn(body["code"], CODES)
        self.assertIsInstance(body["detail"], str)

    def test_deeply_nested_unrouted_path(self):
        response = self.client.get("/api/v1/repositories/42/commits/abc/risk/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response["Content-Type"], "application/json")

    def test_every_method_gets_json(self):
        for method in ("get", "post", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)("/api/v1/nope/")

                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
                self.assertEqual(response["Content-Type"], "application/json")

    def test_routed_endpoints_are_unaffected(self):
        # The catch-all must sit *after* the real routes, not shadow them.
        self.assertEqual(self.client.get("/api/v1/health/").status_code, status.HTTP_200_OK)

    def test_non_api_paths_keep_djangos_own_404(self):
        # /admin/ and static files are not API callers and must not be forced
        # into a JSON contract they do not speak.
        response = self.client.get("/definitely-not-an-api-path/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotEqual(response["Content-Type"], "application/json")

    def test_the_response_is_identical_for_every_unrouted_path(self):
        # A 404 that varies by path tells an unauthenticated caller which routes
        # exist. These are byte-identical.
        first = self.client.get("/api/v1/aaa/").content
        second = self.client.get("/api/v1/bbb/ccc/ddd/").content

        self.assertEqual(first, second)


@override_settings(DEBUG=False)
class ServerErrorHandlerTests(SimpleTestCase):
    """``handler500`` is wired and dispatches on the path."""

    def test_handler_is_registered(self):
        from config import urls

        self.assertEqual(urls.handler500, "common.views.server_error")

    def test_api_path_gets_json(self):
        response = server_error(RequestFactory().get("/api/v1/repositories/"))

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response["Content-Type"], "application/json")

    def test_body_carries_no_exception_detail(self):
        import json

        body = json.loads(server_error(RequestFactory().get("/api/v1/x/")).content)

        # Fixed string by design: an exception message can carry a connection
        # string or a token, and this is the one response rendered with the
        # exception still in scope.
        self.assertEqual(body, {"detail": "Internal server error.", "code": "server_error"})
        self.assertIn(body["code"], CODES)

    def test_non_api_path_keeps_djangos_html_page(self):
        response = server_error(RequestFactory().get("/admin/"))

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertNotEqual(response["Content-Type"], "application/json")


class CsrfFailureTests(SimpleTestCase):
    """CSRF rejection happens in middleware, before any view or DRF handler.

    Django's test client disables CSRF enforcement by default, which is exactly
    why the HTML-403 defect this guards against survived 109 passing tests and
    was only found by issuing a real ``POST`` over HTTP. Every test here uses
    ``enforce_csrf_checks=True``.
    """

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

    def test_unauthenticated_post_to_an_unrouted_path_is_a_json_404(self):
        # Not a 403: the fallback is csrf_exempt, so the caller learns the route
        # does not exist rather than being told their token is stale.
        response = self.client.post("/api/v1/nope/", {"a": "b"})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json()["code"], "not_found")

    def test_failure_view_is_wired_in_settings(self):
        from django.conf import settings

        self.assertEqual(settings.CSRF_FAILURE_VIEW, "common.views.csrf_failure")

    def test_api_csrf_failure_is_json(self):
        response = csrf_failure(RequestFactory().post("/api/v1/auth/login/"), reason="no token")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(body_of(response)["code"], "permission_denied")
        self.assertIn(body_of(response)["code"], CODES)

    def test_djangos_internal_reason_is_not_echoed_to_the_caller(self):
        reason = "CSRF cookie not set - referer checking failed for https://internal.example"
        response = csrf_failure(RequestFactory().post("/api/v1/auth/login/"), reason=reason)

        self.assertNotIn("internal.example", response.content.decode())
        self.assertNotIn("referer", response.content.decode().lower())

    def test_non_api_csrf_failure_keeps_djangos_page(self):
        response = csrf_failure(RequestFactory().post("/admin/login/"), reason="no token")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotEqual(response["Content-Type"], "application/json")


class BadRequestAndForbiddenHandlerTests(SimpleTestCase):
    """``handler400`` and ``handler403``.

    These cover failures raised outside the DRF stack: ``SuspiciousOperation``,
    ``DisallowedHost``, a body over ``DATA_UPLOAD_MAX_MEMORY_SIZE``, and a bare
    ``PermissionDenied``.
    """

    def test_handlers_are_registered(self):
        from config import urls

        self.assertEqual(urls.handler400, "common.views.bad_request")
        self.assertEqual(urls.handler403, "common.views.permission_denied")

    def test_api_bad_request_is_json(self):
        response = bad_request(RequestFactory().get("/api/v1/x/"), Exception("suspicious"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertIn(response.json()["code"], CODES)

    def test_api_permission_denied_is_json(self):
        response = permission_denied(RequestFactory().get("/api/v1/x/"), Exception("nope"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json()["code"], "permission_denied")

    def test_the_exception_message_never_reaches_the_body(self):
        secret = "postgres://user:hunter2@db:5432/repoguard"
        for view in (bad_request, permission_denied):
            with self.subTest(view=view.__name__):
                response = view(RequestFactory().get("/api/v1/x/"), Exception(secret))

                self.assertNotIn("hunter2", response.content.decode())

    def test_non_api_paths_keep_djangos_pages(self):
        for view in (bad_request, permission_denied):
            with self.subTest(view=view.__name__):
                response = view(RequestFactory().get("/admin/"), Exception("x"))

                self.assertNotEqual(response["Content-Type"], "application/json")
