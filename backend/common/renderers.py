"""JSON renderer that emits camelCase keys.

Wraps DRF's ``JSONRenderer`` and converts mapping keys on the way out. Values are
never touched - see :mod:`common.case` for why that distinction matters.
"""

from __future__ import annotations

from typing import Any

from rest_framework.renderers import JSONRenderer

from common.case import camelize


class CamelCaseJSONRenderer(JSONRenderer):
    """Renders ``{"model_version": None}`` as ``{"modelVersion": null}``."""

    def render(
        self,
        data: Any,
        accepted_media_type: str | None = None,
        renderer_context: dict[str, Any] | None = None,
    ) -> bytes:
        return super().render(camelize(data), accepted_media_type, renderer_context)
