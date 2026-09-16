"""Pagination envelope and page-size handling.

The envelope is DRF's ``PageNumberPagination`` because ``types/common.ts``
declares exactly that shape::

    interface Paginated<T> { count; next; previous; results }

The customisation is page size: ``ListParams`` sends ``pageSize``, query
parameters do not pass through :mod:`common.parsers`, and the server-side cap
must hold whatever is asked for.
"""

from __future__ import annotations

from django.test import SimpleTestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from common.pagination import DefaultPagination, LargePagination, unpaginated


def _request(query: str = ""):
    return Request(APIRequestFactory().get(f"/items/{query}"))


class PageSizeTests(SimpleTestCase):
    def setUp(self):
        self.paginator = DefaultPagination()

    def test_default_when_absent(self):
        self.assertEqual(self.paginator.get_page_size(_request()), 20)

    def test_accepts_camel_case(self):
        self.assertEqual(self.paginator.get_page_size(_request("?pageSize=7")), 7)

    def test_accepts_snake_case(self):
        self.assertEqual(self.paginator.get_page_size(_request("?page_size=7")), 7)

    def test_snake_case_wins_when_both_present(self):
        # Arbitrary but deterministic; documented so it is not rediscovered.
        self.assertEqual(self.paginator.get_page_size(_request("?page_size=5&pageSize=9")), 5)

    def test_cap_is_enforced(self):
        # An unbounded page size is a denial-of-service on any table worth
        # paginating, so the cap is server-side and not advisory.
        self.assertEqual(self.paginator.get_page_size(_request("?pageSize=100000")), 100)

    def test_garbage_falls_back_to_default(self):
        for value in ("abc", "", "-1", "0", "1.5"):
            with self.subTest(value=value):
                self.assertEqual(self.paginator.get_page_size(_request(f"?pageSize={value}")), 20)

    def test_large_pagination_has_its_own_cap(self):
        paginator = LargePagination()

        self.assertEqual(paginator.get_page_size(_request()), 100)
        self.assertEqual(paginator.get_page_size(_request("?pageSize=10000")), 500)


class EnvelopeTests(SimpleTestCase):
    def test_matches_the_frontend_type(self):
        paginator = DefaultPagination()
        page = paginator.paginate_queryset(list(range(45)), _request("?pageSize=20"))
        body = paginator.get_paginated_response(page).data

        self.assertEqual(list(body), ["count", "next", "previous", "results"])
        self.assertEqual(body["count"], 45)
        self.assertEqual(len(body["results"]), 20)
        self.assertIsNone(body["previous"])
        self.assertIsNotNone(body["next"])


class UnpaginatedMarkerTests(SimpleTestCase):
    def test_returns_the_list_unchanged(self):
        # Two endpoints return a bare array by contract. The marker makes those
        # call sites greppable rather than looking like an oversight.
        data = [{"id": 1}]
        self.assertIs(unpaginated(data), data)
