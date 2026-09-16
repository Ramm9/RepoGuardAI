"""The flat error contract.

``lib/api/client.ts`` reads ``detail``, ``message``, ``code``, and then treats
**every other top-level key** whose value is a string or string[] as a field
error. So the properties asserted here are not stylistic:

* nesting field errors under ``errors`` would make them invisible to the client;
* leaving ``non_field_errors`` in place would surface it as a form field named
  ``nonFieldErrors`` that matches nothing;
* a serializer field genuinely named ``detail`` would overwrite the human
  message;
* ``code`` must survive to the wire, because ``requiresReauth`` keys off
  ``github_token_expired`` / ``github_unauthorized``.
"""

from __future__ import annotations

from django.test import SimpleTestCase, override_settings
from django.urls import path
from rest_framework import serializers, status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.exceptions import NotFound, Throttled
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from common.authentication import CookieSessionAuthentication
from common.exceptions import (
    CODES,
    AnalysisInProgress,
    EmailTaken,
    GitHubTokenExpired,
    InvalidCredentials,
)

# ---------------------------------------------------------------------------
# Fixtures: serializers and views exercised through a throwaway URLconf
# ---------------------------------------------------------------------------


class FileSerializer(serializers.Serializer):
    path = serializers.CharField()


class PayloadSerializer(serializers.Serializer):
    email = serializers.EmailField()
    repository_ids = serializers.ListField(child=serializers.IntegerField())
    files = FileSerializer(many=True)

    def validate(self, attrs):
        if attrs["email"] == "conflict@example.com":
            raise serializers.ValidationError("Branch and repository disagree.")
        return attrs


class ShadowSerializer(serializers.Serializer):
    """Fields whose names collide with reserved top-level keys."""

    detail = serializers.CharField()
    code = serializers.CharField()
    message = serializers.CharField()


class AlwaysDeny(BasePermission):
    def has_permission(self, request, view):
        return False


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def validate_view(request):
    serializer = PayloadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response({"ok": True})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def shadow_view(request):
    serializer = ShadowSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response({"ok": True})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def raise_view(request):
    which = request.query_params.get("which")
    raise {
        "email_taken": EmailTaken,
        "invalid_credentials": InvalidCredentials,
        "github_token_expired": GitHubTokenExpired,
        "analysis_in_progress": AnalysisInProgress,
        "not_found": NotFound,
    }[which]()


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def throttled_view(request):
    raise Throttled(wait=30)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def missing_view(request):
    from django.http import Http404

    raise Http404("internal message that must not leak")


@api_view(["GET"])
@authentication_classes([CookieSessionAuthentication])
@permission_classes([AlwaysDeny])
def denied_view(request):
    return Response({"ok": True})  # pragma: no cover - permission always denies


urlpatterns = [
    path("validate/", validate_view),
    path("shadow/", shadow_view),
    path("raise/", raise_view),
    path("throttled/", throttled_view),
    path("missing/", missing_view),
    path("denied/", denied_view),
]


@override_settings(ROOT_URLCONF=__name__)
class ValidationErrorShapeTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_field_errors_are_top_level_and_camel_cased(self):
        response = self.client.post("/validate/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = response.json()
        self.assertEqual(body["code"], "validation_error")
        self.assertIn("detail", body)
        # Top level, not nested under "errors".
        self.assertNotIn("errors", body)
        self.assertIsInstance(body["email"], list)
        # snake_case serializer field -> camelCase wire key, which is the name
        # react-hook-form registered.
        self.assertIn("repositoryIds", body)
        self.assertNotIn("repository_ids", body)

    def test_nested_errors_become_dot_paths(self):
        response = self.client.post(
            "/validate/",
            {"email": "a@b.com", "repository_ids": [1], "files": [{}]},
            format="json",
        )

        body = response.json()
        self.assertIn("files.0.path", body)
        self.assertIsInstance(body["files.0.path"], list)

    def test_non_field_errors_promoted_into_detail(self):
        response = self.client.post(
            "/validate/",
            {
                "email": "conflict@example.com",
                "repository_ids": [1],
                "files": [{"path": "a.py"}],
            },
            format="json",
        )

        body = response.json()
        self.assertEqual(body["detail"], "Branch and repository disagree.")
        self.assertNotIn("nonFieldErrors", body)
        self.assertNotIn("non_field_errors", body)

    def test_reserved_keys_are_never_shadowed_by_field_errors(self):
        response = self.client.post("/shadow/", {}, format="json")

        body = response.json()
        # The human message survives; the colliding field errors are renamed.
        self.assertEqual(body["code"], "validation_error")
        self.assertEqual(body["detail"], "The request could not be completed.")
        self.assertIn("detailField", body)
        self.assertIn("codeField", body)
        self.assertIn("messageField", body)

    def test_every_value_is_a_string_list(self):
        # The client only recognises string | string[] as a field error.
        body = self.client.post("/validate/", {}, format="json").json()
        for key, value in body.items():
            if key in {"detail", "code", "message"}:
                self.assertIsInstance(value, str)
            else:
                self.assertIsInstance(value, list)
                self.assertTrue(all(isinstance(item, str) for item in value))


@override_settings(ROOT_URLCONF=__name__)
class ErrorCodeTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_domain_codes_reach_the_wire(self):
        cases = {
            "email_taken": (400, "email_taken"),
            "invalid_credentials": (401, "invalid_credentials"),
            "github_token_expired": (401, "github_token_expired"),
            "analysis_in_progress": (409, "analysis_in_progress"),
        }
        for which, (expected_status, expected_code) in cases.items():
            with self.subTest(which=which):
                response = self.client.get(f"/raise/?which={which}")
                self.assertEqual(response.status_code, expected_status)
                self.assertEqual(response.json()["code"], expected_code)

    def test_all_emitted_codes_are_reserved(self):
        for which in ("email_taken", "invalid_credentials", "github_token_expired",
                      "analysis_in_progress", "not_found"):
            with self.subTest(which=which):
                self.assertIn(self.client.get(f"/raise/?which={which}").json()["code"], CODES)

    def test_http404_does_not_leak_its_internal_message(self):
        response = self.client.get("/missing/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        body = response.json()
        self.assertEqual(body, {"detail": "Not found.", "code": "not_found"})

    def test_throttle_sets_retry_after(self):
        response = self.client.get("/throttled/")

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.json()["code"], "throttled")
        self.assertEqual(response["Retry-After"], "30")


@override_settings(ROOT_URLCONF=__name__)
class AuthenticationStatusTests(SimpleTestCase):
    """DRF returns 403 for an unauthenticated session request. The frontend
    keys its reauth path off 401, so the handler corrects it."""

    def test_anonymous_denial_is_401(self):
        response = APIClient().get("/denied/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()["code"], "not_authenticated")

    def test_authenticated_denial_stays_403(self):
        from django.contrib.auth.models import User

        request = APIRequestFactory().get("/denied/")
        force_authenticate(request, user=User(pk=1, username="someone"))
        response = denied_view(request)
        response.render()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "permission_denied")
