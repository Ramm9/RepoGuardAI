"""Structured logging with secret redaction.

Two pieces:

* :class:`RedactingFilter` scrubs anything that looks like a credential out of
  the log record **before** it reaches a handler. It operates on the record, not
  at the call site, because relying on every future call site to remember is
  exactly how secrets end up in logs.
* :class:`JsonFormatter` emits one JSON object per line with the fields
  docs/security.md §11 requires for audit: ``request_id``, ``user_id``, ``path``,
  ``method``, ``status``, ``duration_ms``.

Never logged: passwords, session keys, GitHub tokens, the App private key, the
webhook secret, the encryption key, ``Authorization``/``Cookie`` headers, or full
webhook payloads.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

#: Keys whose *values* are replaced wholesale.
SENSITIVE_KEY = re.compile(
    r"(token|secret|password|passwd|api[_-]?key|encryption[_-]?key|private[_-]?key"
    r"|authorization|cookie|session[_-]?key|signature|credential)",
    re.IGNORECASE,
)

#: Credential-shaped literals that can appear inside an otherwise innocent string.
SENSITIVE_VALUE = re.compile(
    r"(gh[pousr]_[A-Za-z0-9]{16,}"  # GitHub tokens
    r"|github_pat_[A-Za-z0-9_]{20,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"
    r"|Bearer\s+[A-Za-z0-9._~+/=-]{12,}"
    r"|sha256=[0-9a-f]{64})"
)

REDACTED = "[REDACTED]"

_MAX_DEPTH = 6


def redact(value: Any, _depth: int = 0) -> Any:
    """Recursively replace credential-shaped data with ``[REDACTED]``."""
    if _depth > _MAX_DEPTH:
        return value
    if isinstance(value, dict):
        return {
            k: (
                REDACTED
                if isinstance(k, str) and SENSITIVE_KEY.search(k)
                else redact(v, _depth + 1)
            )
            for k, v in value.items()
        }
    if isinstance(value, list | tuple | set):
        converted = [redact(item, _depth + 1) for item in value]
        return type(value)(converted) if not isinstance(value, list) else converted
    if isinstance(value, str):
        return SENSITIVE_VALUE.sub(REDACTED, value)
    return value


class RedactingFilter(logging.Filter):
    """Scrubs the message, args, and structured extras of every record."""

    #: Attributes the formatter reads; anything else on the record is left alone.
    EXTRA_FIELDS = ("request_id", "user_id", "path", "method", "status", "duration_ms", "context")

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = SENSITIVE_VALUE.sub(REDACTED, record.msg)
        elif record.msg is not None:
            record.msg = redact(record.msg)

        if record.args:
            record.args = redact(record.args)

        for field in self.EXTRA_FIELDS:
            if hasattr(record, field):
                setattr(record, field, redact(getattr(record, field)))

        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
        }
        for field in RedactingFilter.EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)
