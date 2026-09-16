"""Request-scoped context: a correlation id and one structured access log line."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("repoguard.request")

HEADER = "HTTP_X_REQUEST_ID"
RESPONSE_HEADER = "X-Request-ID"


class RequestIDMiddleware:
    """Attaches ``request.request_id`` and echoes it on the response.

    An inbound ``X-Request-ID`` is trusted only as far as correlation goes - it
    is truncated and never used for anything that matters, because it is
    caller-controlled.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        incoming = request.META.get(HEADER, "")
        request.request_id = incoming[:64] if incoming else uuid.uuid4().hex
        response = self.get_response(request)
        response[RESPONSE_HEADER] = request.request_id
        return response


class RequestLogMiddleware:
    """Emits one structured line per request.

    Bodies and headers are never logged - see docs/security.md §11. Only the
    method, path, status, duration, and identity are recorded.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        started = time.perf_counter()
        response = self.get_response(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)

        user = getattr(request, "user", None)
        user_id = str(user.pk) if user is not None and user.is_authenticated else None

        logger.info(
            "%s %s %s",
            request.method,
            request.path,
            response.status_code,
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": user_id,
                "path": request.path,
                "method": request.method,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
