"""Views that belong to no domain.

These exist because the error contract has to hold for requests that never reach
a DRF view. :mod:`common.exceptions` converts exceptions *raised inside* a view.
It never sees a path that failed to resolve, a CSRF rejection (which happens in
middleware, before the view runs), or an exception that escaped the view layer -
and all of those otherwise fall through to Django's own handlers, which render
HTML.

That matters concretely: ``lib/api/client.ts`` calls ``response.json()`` on
every non-2xx response. An HTML body surfaces in the UI as a JSON parse error
instead of the status the server actually meant, so the user sees a misleading
failure and the real status is lost.

Both holes patched here were found by making real HTTP requests, not by the test
suite - Django's test client disables CSRF enforcement by default, so no test
using it can observe the CSRF path at all. The tests in
``common/tests/test_api_fallbacks.py`` set ``enforce_csrf_checks=True``
explicitly for that reason.

Codes are reused from :data:`common.exceptions.CODES` rather than invented. The
frontend switches on a closed set of codes derived in Phase 0; a code it has
never seen falls through to its generic handler, which is worse than an accurate
reuse of an existing one.
"""

from __future__ import annotations

from typing import Any

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.defaults import bad_request as django_bad_request
from django.views.defaults import permission_denied as django_permission_denied
from django.views.defaults import server_error as django_server_error

#: Paths under this prefix answer in JSON no matter how the request fails.
API_PREFIX = "/api/"


def _is_api(request: HttpRequest) -> bool:
    return request.path.startswith(API_PREFIX)


def _json(detail: str, code: str, status: int) -> JsonResponse:
    return JsonResponse({"detail": detail, "code": code}, status=status)


@csrf_exempt
def api_not_found(request: HttpRequest, *args: Any, **kwargs: Any) -> JsonResponse:
    """JSON 404 for unrouted paths under the API prefix.

    Registered as the last pattern matching ``^api/v1/`` in the root URLconf, so
    it catches anything the domain URLconfs did not claim - a typo, a stale
    frontend build, or an endpoint whose phase has not landed yet.

    ``csrf_exempt`` because CSRF runs in middleware *before* the view, so a
    ``POST`` to an unrouted path would otherwise be answered by Django's HTML
    403 page instead of this 404. There is nothing to protect: the view reads
    nothing, writes nothing, and returns the same bytes for every path.

    Deliberately a plain Django view rather than an ``APIView``: it is a
    fallback, not an endpoint. Having no ``permission_classes`` keeps it out of
    the public-endpoint allowlist enumeration in
    ``common/tests/test_settings_contract.py``, which is the correct outcome -
    there is nothing here to authorise, and it discloses nothing either way
    since the response is identical for every unrouted path.
    """
    return _json("Not found.", "not_found", 404)


def csrf_failure(request: HttpRequest, reason: str = "", *args: Any) -> HttpResponse:
    """``CSRF_FAILURE_VIEW``.

    Wired in settings so that every state-changing endpoint from Phase 3 onward
    inherits it - login, register, repository connect, settings. Without it, a
    stale CSRF cookie produces an HTML 403 that the frontend cannot parse, which
    reads to the user as "something broke" rather than "your session went stale,
    sign in again".

    403 / ``permission_denied`` rather than a new code: the frontend's code set
    is closed, and this is genuinely a refusal to act on an unverified request.
    ``reason`` is deliberately not echoed - it is Django's internal diagnostic
    string, and it belongs in the logs.
    """
    if _is_api(request):
        return _json(
            "CSRF verification failed. Refresh the page and try again.",
            "permission_denied",
            403,
        )
    return django_permission_denied(request, Exception(reason))


def bad_request(request: HttpRequest, exception: Exception, *args: Any) -> HttpResponse:
    """``handler400`` - ``SuspiciousOperation``, ``DisallowedHost``, oversized body."""
    if _is_api(request):
        return _json("Bad request.", "validation_error", 400)
    return django_bad_request(request, exception, *args)


def permission_denied(request: HttpRequest, exception: Exception, *args: Any) -> HttpResponse:
    """``handler403`` - ``PermissionDenied`` raised outside a DRF view."""
    if _is_api(request):
        return _json("You do not have permission to perform this action.", "permission_denied", 403)
    return django_permission_denied(request, exception, *args)


def server_error(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
    """``handler500`` that keeps API responses in JSON.

    The body is a fixed string. An unhandled exception's message can contain a
    connection string, a query fragment, or a token, and this response is the
    one place where DEBUG is off but the exception detail is still in scope -
    the traceback belongs in the logs, not in the response.
    """
    if _is_api(request):
        return _json("Internal server error.", "server_error", 500)
    return django_server_error(request, *args, **kwargs)
