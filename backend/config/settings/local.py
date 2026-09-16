"""Development settings.

The ``SECRET_KEY`` here is a visible, obviously-fake development value. It is
deliberately *not* read from the environment with a fallback: a fallback is how a
development key silently reaches production. ``production.py`` reads the real one
with no default at all, so a missing value is an import-time crash rather than a
quietly weak signing key.

Defaults here favour "runs on a laptop with nothing installed": SQLite instead of
PostgreSQL, eager Celery if Celery is even importable, LocMem cache instead of
Redis. Every one of those degradations is visible in ``/api/v1/health/``.
"""

from __future__ import annotations

import copy

from common.env import env

from .base import *  # noqa: F403
from .base import BASE_DIR, LOGGING

DEBUG = env.bool("DEBUG", default=True)

# Development-only. Never used outside DEBUG, never shared with production.
SECRET_KEY = env.str(
    "DJANGO_SECRET_KEY",
    default="django-insecure-local-development-key-not-for-production-use",
)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "[::1]", "testserver"])

# PostgreSQL 16 is the target (docs/database.md). SQLite is the fallback so the
# suite runs where a server is not available. Consequence, recorded rather than
# hidden: JSONField stands in for ArrayField, and a handful of PostgreSQL-only
# index types are skipped. Partial unique indexes - the ones idempotency depends
# on - work on both.
DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default={"ENGINE": "django.db.backends.sqlite3", "NAME": str(BASE_DIR / "db.sqlite3")},
    ),
}

# Cookies over plain HTTP in development; production.py flips all three.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Deep-copied before mutation. `from .base import *` binds base's dict *object*,
# so mutating it in place would edit the settings of whichever other environment
# module also imported it - invisible in a real process where only one is ever
# loaded, and a genuine cross-test contamination bug in the suite.
LOGGING = copy.deepcopy(LOGGING)
LOGGING["handlers"]["console"]["formatter"] = env.str("LOG_FORMAT", default="plain")

INTERNAL_IPS = ["127.0.0.1"]
