"""JSON parser that accepts camelCase or snake_case request bodies.

``services/onboarding.ts`` posts ``{repository_ids, branch}`` - snake_case - so
the serializers are written in snake_case and this parser normalises anything
camelCase that arrives from a future call site. Accepting both is strictly safer
than accepting one and silently ignoring unknown fields.
"""

from __future__ import annotations

from typing import Any

from rest_framework.parsers import JSONParser

from common.case import underscoreize


class SnakeCaseJSONParser(JSONParser):
    """Normalises incoming mapping keys to snake_case."""

    def parse(
        self,
        stream: Any,
        media_type: str | None = None,
        parser_context: dict[str, Any] | None = None,
    ) -> Any:
        return underscoreize(super().parse(stream, media_type, parser_context))
