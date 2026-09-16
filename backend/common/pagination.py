"""Pagination matching the frontend's ``Paginated<T>`` type.

``types/common.ts``::

    export interface Paginated<T> {
      count: number;
      next: string | null;
      previous: string | null;
      results: T[];
    }

That is DRF's ``PageNumberPagination`` envelope exactly, so the envelope is kept
and only the page-size handling is customised.

``ListParams`` sends ``pageSize``; a snake_case ``page_size`` is also accepted
because query parameters do not pass through :class:`common.parsers`. The cap is
enforced server-side regardless of what is asked for - an unbounded
``?pageSize=100000`` is a denial-of-service on any table worth paginating.
"""

from __future__ import annotations

from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request


class DefaultPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"

    def get_page_size(self, request: Request) -> int | None:
        """Accept ``page_size`` or ``pageSize``; clamp to ``max_page_size``."""
        raw = request.query_params.get("page_size") or request.query_params.get("pageSize")
        if raw is None:
            return self.page_size
        try:
            requested = int(raw)
        except (TypeError, ValueError):
            return self.page_size
        if requested <= 0:
            return self.page_size
        return min(requested, self.max_page_size)


class LargePagination(DefaultPagination):
    """For dense time-series style listings that the UI renders in one pass."""

    page_size = 100
    max_page_size = 500


def unpaginated(data: list[Any]) -> list[Any]:
    """Marker for the two endpoints that return a bare array.

    ``GET /github/repositories/`` and
    ``GET /github/repositories/{id}/branches/`` return bare arrays, not
    ``Paginated<T>`` - observed in ``services/onboarding.ts``, which types them
    as ``AvailableRepository[]`` and ``string[]``. This helper exists so those
    call sites are greppable rather than looking like an oversight.
    """
    return data
