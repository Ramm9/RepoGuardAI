"""Test settings.

In-memory SQLite, a fast password hasher, and eager Celery. Nothing here reaches
the network: a test that needs GitHub uses a fake client, never a live call.

The GitHub credentials below are fixed, obviously-fake literals so that signature
tests have something deterministic to sign with. They are test fixtures, not
secrets, and they exist only in this module.
"""

from __future__ import annotations

import copy

from .base import *  # noqa: F403
from .base import LOGGING, REST_FRAMEWORK

DEBUG = False

SECRET_KEY = "test-only-secret-key-never-used-outside-the-test-suite"

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "TEST": {"NAME": ":memory:"},
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Password validators stay on: registration tests assert the real rules.

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "repoguard-test",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Throttles off by default; the throttle tests re-enable them explicitly with
# override_settings so that every other test is not rate-limited by its
# neighbours.
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": []}

# Deterministic fixtures. Fake by construction - see the module docstring.
GITHUB_APP_ID = "000000"
GITHUB_APP_SLUG = "repoguard-test"
GITHUB_APP_CLIENT_ID = "Iv1.testclientid"
GITHUB_APP_CLIENT_SECRET = "test-client-secret"
GITHUB_WEBHOOK_SECRET = "test-webhook-secret"
GITHUB_TOKEN_ENCRYPTION_KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy0hIQ=="

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False

# Silence logging during tests. Setting only the root level is not enough:
# `repoguard` and Django's own `django` logger carry explicit levels, and an
# explicit level is not inherited from root. The loop keeps this correct as
# loggers are added in later phases.
#
# `common/tests/test_logging_redaction.py` does not depend on this - it attaches
# its own handler, so redaction is still exercised end to end.
LOGGING = copy.deepcopy(LOGGING)
LOGGING["root"]["level"] = "CRITICAL"
for _logger in LOGGING["loggers"].values():
    _logger["level"] = "CRITICAL"
for _name in ("django", "django.request", "django.server", "django.security"):
    LOGGING["loggers"].setdefault(_name, {"propagate": True})["level"] = "CRITICAL"

