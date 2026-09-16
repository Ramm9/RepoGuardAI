"""The error contract.

``lib/api/client.ts`` parses error bodies like this::

    const detail  = body.detail;
    const message = body.message;
    const code    = body.code;
    // every OTHER top-level key whose value is a string or string[]
    // becomes a field error

So the contract is **flat**. Field errors sit at the top level beside
``detail``/``message``/``code`` - not nested under an ``errors`` object. Any
shape other than this is silently mis-parsed by the frontend, which is why this
module exists rather than leaving DRF's defaults in place.

Emitted shape::

    {
      "detail": "Human-readable message.",
      "code": "machine_readable_code",
      "email": ["This email is already registered."]
    }

Three behaviours that follow from the client code:

* ``non_field_errors`` is promoted into ``detail``. Left alone it would reach the
  frontend as a field error named ``nonFieldErrors``, matching no form field.
* Nested serializer errors are flattened to dot paths (``files.0.path``), which
  is exactly the key format ``react-hook-form`` uses for nested fields.
* ``code`` is always present. ``requiresReauth`` in the client keys off
  ``github_token_expired`` / ``github_unauthorized``, so those codes must survive
  to the wire.
"""

from __future__ import annotations

import logging
from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, NotAuthenticated, ValidationError
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

#: Reserved error codes. The frontend keys behaviour off some of these, so they
#: are enumerated rather than invented per call site.
#: docs/api-contract.md §3.3.
CODES = {
    "invalid_credentials",
    "email_taken",
    "validation_error",
    "github_not_connected",
    "github_token_expired",
    "github_unauthorized",
    "github_rate_limited",
    "repository_not_monitored",
    "analysis_in_progress",
    "not_found",
    "permission_denied",
    "not_authenticated",
    "throttled",
    "invalid_signature",
    "server_error",
}


class ApiError(APIException):
    """Base for errors that carry a stable machine-readable ``code``."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The request could not be completed."
    error_code = "validation_error"

    def __init__(self, detail: str | None = None, code: str | None = None) -> None:
        super().__init__(detail or self.default_detail)
        if code is not None:
            self.error_code = code


class InvalidCredentials(ApiError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Incorrect email or password."
    error_code = "invalid_credentials"


class EmailTaken(ApiError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "An account with this email already exists."
    error_code = "email_taken"


class GitHubNotConnected(ApiError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Connect a GitHub account to continue."
    error_code = "github_not_connected"


class GitHubTokenExpired(ApiError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "The GitHub connection has expired. Reconnect to continue."
    error_code = "github_token_expired"


class GitHubUnauthorized(ApiError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "GitHub rejected the request. Reconnect to continue."
    error_code = "github_unauthorized"


class GitHubRateLimited(ApiError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "GitHub's rate limit was reached. Try again shortly."
    error_code = "github_rate_limited"


class RepositoryNotMonitored(ApiError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This repository is not currently monitored."
    error_code = "repository_not_monitored"


class AnalysisInProgress(ApiError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "An analysis is already running for this repository."
    error_code = "analysis_in_progress"


class InvalidSignature(ApiError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid signature."
    error_code = "invalid_signature"


# --------------------------------------------------------------------------
# Handler
# --------------------------------------------------------------------------

_STATUS_CODES = {
    400: "validation_error",
    401: "not_authenticated",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    429: "throttled",
}

_DEFAULT_DETAIL = {
    400: "The request could not be completed.",
    401: "Authentication is required.",
    403: "You do not have permission to perform this action.",
    404: "Not found.",
    429: "Too many requests. Try again shortly.",
}


def _flatten(detail: Any, prefix: str = "") -> dict[str, list[str]]:
    """Flatten a nested DRF validation detail into dot-path keys.

    ``{"files": [{"path": ["Required."]}]}`` -> ``{"files.0.path": ["Required."]}``
    which is the key format ``react-hook-form`` uses for nested fields.
    """
    flat: dict[str, list[str]] = {}

    if isinstance(detail, dict):
        for key, value in detail.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            flat.update(_flatten(value, path))
        return flat

    if isinstance(detail, list):
        # A list of plain messages is the leaf case; a list of structures is not.
        if all(not isinstance(item, dict | list) for item in detail):
            if prefix:
                flat[prefix] = [str(item) for item in detail]
            return flat
        for index, item in enumerate(detail):
            path = f"{prefix}.{index}" if prefix else str(index)
            flat.update(_flatten(item, path))
        return flat

    if prefix:
        flat[prefix] = [str(detail)]
    return flat


def _validation_body(exc: ValidationError) -> dict[str, Any]:
    body: dict[str, Any] = {"code": "validation_error"}
    detail = exc.detail

    # A bare list or string raised by a validator is a message, not a field error.
    if not isinstance(detail, dict):
        messages = _flatten(detail, "non_field_errors").get("non_field_errors", [])
        body["detail"] = messages[0] if messages else _DEFAULT_DETAIL[400]
        return body

    fields = _flatten(detail)
    non_field = fields.pop("non_field_errors", None)
    body["detail"] = non_field[0] if non_field else _DEFAULT_DETAIL[400]
    for key, messages in fields.items():
        # Never let a field error shadow a reserved top-level key.
        if key in {"detail", "message", "code"}:
            key = f"{key}_field"
        body[key] = messages
    return body


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """DRF exception handler producing the flat error contract."""
    if isinstance(exc, Http404):
        exc = _as_api(status.HTTP_404_NOT_FOUND, "not_found")
    elif isinstance(exc, DjangoPermissionDenied):
        exc = _as_api(status.HTTP_403_FORBIDDEN, "permission_denied")

    response = drf_exception_handler(exc, context)
    if response is None:
        # An unhandled exception. Django's handler turns this into a 500; log it
        # with the request id and let it through rather than inventing a body.
        logger.exception("Unhandled exception in API view", exc_info=exc)
        return None

    if isinstance(exc, ValidationError):
        body = _validation_body(exc)
    else:
        code = getattr(exc, "error_code", None)
        if code is None:
            code = _STATUS_CODES.get(response.status_code, "server_error")
        detail = getattr(exc, "detail", None)
        body = {
            "detail": (
                str(detail) if detail else _DEFAULT_DETAIL.get(response.status_code, "Error.")
            ),
            "code": code,
        }

    # NotAuthenticated is a 401 to the frontend, which triggers its reauth path.
    if isinstance(exc, NotAuthenticated | DRFPermissionDenied) and not request_is_authenticated(
        context
    ):
        response.status_code = status.HTTP_401_UNAUTHORIZED
        body["code"] = "not_authenticated"
        body["detail"] = _DEFAULT_DETAIL[401]

    wait = getattr(exc, "wait", None)
    if wait is not None:
        response.headers["Retry-After"] = str(int(wait))

    response.data = body
    return response


def request_is_authenticated(context: dict[str, Any]) -> bool:
    request = context.get("request")
    user = getattr(request, "user", None)
    return bool(user and getattr(user, "is_authenticated", False))


def _as_api(status_code: int, code: str) -> ApiError:
    error = ApiError(_DEFAULT_DETAIL.get(status_code, "Error."), code=code)
    error.status_code = status_code
    return error
