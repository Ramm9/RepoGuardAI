"""Production settings.

Every secret is re-read here **with no default**. ``common.env`` raises
``ImproperlyConfigured`` when a name with no default is absent, so a missing
``GITHUB_WEBHOOK_SECRET`` stops the process at import instead of starting a
service that accepts unsigned webhooks.

That is the single most important property of this file. A default is not a
convenience for a secret - it is a security control that fails open.
"""

from __future__ import annotations

import copy

from django.core.exceptions import ImproperlyConfigured

from common.env import env

from .base import *  # noqa: F403
from .base import LOGGING

DEBUG = False

# No default. Absent -> ImproperlyConfigured at import.
SECRET_KEY = env.str("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must list at least one host in production.")

DATABASES = {"default": env.db_url("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"].setdefault("OPTIONS", {})
if DATABASES["default"]["ENGINE"].endswith("postgresql"):
    DATABASES["default"]["OPTIONS"].setdefault("connect_timeout", 10)

# --------------------------------------------------------------------------
# Secrets - no defaults
# --------------------------------------------------------------------------

GITHUB_APP_ID = env.str("GITHUB_APP_ID")
GITHUB_APP_SLUG = env.str("GITHUB_APP_SLUG")
GITHUB_APP_CLIENT_ID = env.str("GITHUB_APP_CLIENT_ID")
GITHUB_APP_CLIENT_SECRET = env.str("GITHUB_APP_CLIENT_SECRET")
GITHUB_WEBHOOK_SECRET = env.str("GITHUB_WEBHOOK_SECRET")
GITHUB_TOKEN_ENCRYPTION_KEY = env.str("GITHUB_TOKEN_ENCRYPTION_KEY")

# The private key is preferred as a mounted file: an env var is visible in
# `docker inspect` and in any crash reporter that dumps the environment.
# docs/deployment.md §3.1.
GITHUB_APP_PRIVATE_KEY_PATH = env.str("GITHUB_APP_PRIVATE_KEY_PATH", default="")
GITHUB_APP_PRIVATE_KEY = env.str("GITHUB_APP_PRIVATE_KEY", default="")
if not GITHUB_APP_PRIVATE_KEY_PATH and not GITHUB_APP_PRIVATE_KEY:
    raise ImproperlyConfigured(
        "Set GITHUB_APP_PRIVATE_KEY_PATH (preferred) or GITHUB_APP_PRIVATE_KEY."
    )

REDIS_URL = env.str("REDIS_URL")
CELERY_BROKER_URL = env.str("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = env.str("CELERY_RESULT_BACKEND", default=REDIS_URL)

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# --------------------------------------------------------------------------
# Transport security
# --------------------------------------------------------------------------

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# SameSite=Lax only defends a same-site deployment. A frontend on a different
# registrable domain needs SameSite=None + Secure, and then the CSRF exemption in
# common.authentication is no longer safe - see docs/security.md §4.
SESSION_COOKIE_SAMESITE = env.str("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must be explicit in production.")

# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------
# JSON lines for log aggregation. The redact filter is already attached in base.
# Deep-copied first - see the note in local.py.

LOGGING = copy.deepcopy(LOGGING)
LOGGING["handlers"]["console"]["formatter"] = "json"
