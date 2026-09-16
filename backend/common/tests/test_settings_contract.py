"""Settings-level security invariants.

These are the properties that are easy to break silently later, so each one is
pinned by a test rather than by a comment:

* every production secret is read with **no default** - absence crashes the
  process at import instead of disabling a security control;
* DRF denies by default, and public endpoints are an explicit, enumerated set;
* CORS is never a wildcard;
* the production module actually sets the transport-security flags it claims to.

The private-key pair is the one deliberate exception to "one name, one read":
either ``GITHUB_APP_PRIVATE_KEY_PATH`` (preferred) or ``GITHUB_APP_PRIVATE_KEY``
satisfies it, and neither satisfies it alone being absent.
"""

from __future__ import annotations

import importlib
import os
from unittest import mock

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.permissions import AllowAny

#: A complete, entirely fake production environment. Every value here is
#: syntactically valid and semantically worthless - nothing in this file is a
#: credential, and nothing in this file reaches a network.
COMPLETE_ENV = {
    "DJANGO_SETTINGS_MODULE": "config.settings.production",
    "DJANGO_SECRET_KEY": "x" * 60,
    "ALLOWED_HOSTS": "repoguard.example.com",
    "DATABASE_URL": "postgres://u:p@db:5432/repoguard",
    "REDIS_URL": "redis://redis:6379/0",
    "GITHUB_APP_ID": "0",
    "GITHUB_APP_SLUG": "repoguard-fake",
    "GITHUB_APP_CLIENT_ID": "fake",
    "GITHUB_APP_CLIENT_SECRET": "fake",
    "GITHUB_APP_PRIVATE_KEY_PATH": "/run/secrets/github-app.pem",
    "GITHUB_WEBHOOK_SECRET": "fake",
    "GITHUB_TOKEN_ENCRYPTION_KEY": "fake",
    "CORS_ALLOWED_ORIGINS": "https://app.example.com",
}

#: Names whose absence must stop the process.
REQUIRED = [
    "DJANGO_SECRET_KEY",
    "ALLOWED_HOSTS",
    "DATABASE_URL",
    "REDIS_URL",
    "GITHUB_APP_ID",
    "GITHUB_APP_SLUG",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_CLIENT_SECRET",
    "GITHUB_WEBHOOK_SECRET",
    "GITHUB_TOKEN_ENCRYPTION_KEY",
    "CORS_ALLOWED_ORIGINS",
]


def _load_production(environ: dict[str, str]):
    """Import ``config.settings.production`` against exactly ``environ``.

    ``clear=True`` matters: a developer's real exported variables must not make
    this test pass on their machine and fail in CI.
    """
    with mock.patch.dict(os.environ, environ, clear=True):
        module = importlib.import_module("config.settings.production")
        return importlib.reload(module)


class ProductionSecretTests(SimpleTestCase):
    def test_loads_when_everything_is_present(self):
        module = _load_production(COMPLETE_ENV)

        self.assertFalse(module.DEBUG)
        self.assertEqual(module.ALLOWED_HOSTS, ["repoguard.example.com"])

    def test_each_required_name_crashes_the_import_when_absent(self):
        for name in REQUIRED:
            with self.subTest(missing=name):
                environ = {k: v for k, v in COMPLETE_ENV.items() if k != name}
                with self.assertRaises(ImproperlyConfigured) as ctx:
                    _load_production(environ)
                self.assertIn(name, str(ctx.exception))

    def test_private_key_requires_one_of_two_names(self):
        without_either = {
            k: v for k, v in COMPLETE_ENV.items() if k != "GITHUB_APP_PRIVATE_KEY_PATH"
        }
        with self.assertRaises(ImproperlyConfigured):
            _load_production(without_either)

        # The inline PEM form is accepted as the alternative.
        inline = {**without_either, "GITHUB_APP_PRIVATE_KEY": "-----BEGIN FAKE-----"}
        module = _load_production(inline)
        self.assertEqual(module.GITHUB_APP_PRIVATE_KEY_PATH, "")

    def test_transport_security_flags(self):
        module = _load_production(COMPLETE_ENV)

        self.assertTrue(module.SESSION_COOKIE_SECURE)
        self.assertTrue(module.CSRF_COOKIE_SECURE)
        self.assertTrue(module.SECURE_SSL_REDIRECT)
        self.assertTrue(module.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertTrue(module.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertGreaterEqual(module.SECURE_HSTS_SECONDS, 31536000)
        self.assertEqual(module.X_FRAME_OPTIONS, "DENY")

    def test_production_never_permits_a_cors_wildcard(self):
        module = _load_production(COMPLETE_ENV)

        self.assertFalse(getattr(module, "CORS_ALLOW_ALL_ORIGINS", False))
        self.assertNotIn("*", module.CORS_ALLOWED_ORIGINS)

    def test_production_does_not_downgrade_logging_of_the_active_settings(self):
        # `from .base import *` binds base's LOGGING *object*. Mutating it in
        # place would silently reconfigure whichever other settings module is
        # actually running - including this test process.
        before = settings.LOGGING["handlers"]["console"]["formatter"]
        _load_production(COMPLETE_ENV)

        self.assertEqual(settings.LOGGING["handlers"]["console"]["formatter"], before)

    def test_redis_is_mandatory_because_throttles_depend_on_it(self):
        module = _load_production(COMPLETE_ENV)

        self.assertIn("RedisCache", module.CACHES["default"]["BACKEND"])


class DefaultDenyTests(SimpleTestCase):
    def test_drf_default_permission_is_authenticated(self):
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"],
            ["rest_framework.permissions.IsAuthenticated"],
        )

    def test_case_conversion_is_wired_not_just_importable(self):
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"],
            ["common.renderers.CamelCaseJSONRenderer"],
        )
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_PARSER_CLASSES"][0],
            "common.parsers.SnakeCaseJSONParser",
        )

    def test_error_handler_is_wired(self):
        self.assertEqual(
            settings.REST_FRAMEWORK["EXCEPTION_HANDLER"],
            "common.exceptions.api_exception_handler",
        )

    def test_session_cookie_is_httponly_and_samesite(self):
        # An httpOnly cookie is out of reach of injected script, which a token in
        # localStorage is not. docs/security.md §3.
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Lax")

    def test_cors_allows_credentials_with_an_explicit_origin_list(self):
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)
        self.assertFalse(getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False))
        self.assertTrue(settings.CORS_ALLOWED_ORIGINS)
        self.assertNotIn("*", settings.CORS_ALLOWED_ORIGINS)


def _iter_api_routes(resolver=None, prefix=""):
    """Yield ``(path, view_callback)`` for every registered route."""
    resolver = resolver or get_resolver()
    for entry in resolver.url_patterns:
        if isinstance(entry, URLResolver):
            yield from _iter_api_routes(entry, prefix + str(entry.pattern))
        elif isinstance(entry, URLPattern):
            yield prefix + str(entry.pattern), entry.callback


class PublicEndpointAllowlistTests(SimpleTestCase):
    """Route enumeration, not inspection of the routes we remembered to check.

    This grows teeth as phases land: the moment someone adds ``AllowAny`` to a
    view without also adding it to ``PUBLIC_ENDPOINT_ALLOWLIST``, this fails.
    """

    def test_every_public_api_route_is_on_the_allowlist(self):
        for route, callback in _iter_api_routes():
            if not route.startswith("api/"):
                continue
            view_class = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
            if view_class is None:
                continue
            permissions = getattr(view_class, "permission_classes", None)
            if permissions is None:
                continue
            if AllowAny in permissions:
                with self.subTest(route=route):
                    self.assertIn("/" + route, settings.PUBLIC_ENDPOINT_ALLOWLIST)

    def test_allowlist_entries_that_exist_yet_resolve_to_public_views(self):
        from django.urls import Resolver404, resolve

        checked = 0
        for entry in settings.PUBLIC_ENDPOINT_ALLOWLIST:
            try:
                match = resolve(entry)
            except Resolver404:
                continue  # Not routed until its phase lands.
            view_class = getattr(match.func, "cls", None)
            if view_class is None:
                continue
            checked += 1
            with self.subTest(entry=entry):
                self.assertIn(AllowAny, view_class.permission_classes)

        # Guard against the test passing because nothing resolved at all.
        self.assertGreaterEqual(checked, 2)

    def test_allowlist_has_no_duplicates_and_no_wildcards(self):
        allowlist = settings.PUBLIC_ENDPOINT_ALLOWLIST

        self.assertEqual(len(allowlist), len(set(allowlist)))
        for entry in allowlist:
            self.assertNotIn("*", entry)
            self.assertTrue(entry.startswith("/api/v1/"))
