"""Settings shared by every environment.

Nothing here has a permissive default for a secret. ``SECRET_KEY`` and the
GitHub credentials are assigned per environment: ``local.py`` supplies obvious
development stand-ins, ``production.py`` reads them with no default so a missing
value crashes at import instead of silently disabling a security control.

See docs/security.md §2.
"""

from __future__ import annotations

from pathlib import Path

from common.env import env

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env.read_env(BASE_DIR / ".env")

REPOGUARD_VERSION = "0.1.0"

# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
]

LOCAL_APPS = [
    "common",
    # Domain apps arrive with their phase:
    #   users            Phase 3
    #   github           Phase 4
    #   repositories     Phase 7
    #   commits          Phase 8
    #   pull_requests    Phase 8
    #   analysis         Phase 6
    #   metrics          Phase 8
    #   risk             Phase 11
    #   ml_engine        Phase 10
    #   analytics        Phase 16
    #   alerts           Phase 15
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "common.middleware.RequestIDMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # CorsMiddleware must precede CommonMiddleware so that CORS headers are
    # present on redirects and error responses too.
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    # Kept enabled for the Django admin. DRF views opt out through
    # common.authentication.CookieSessionAuthentication - see docs/security.md §4.
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "common.middleware.RequestLogMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --------------------------------------------------------------------------
# Localisation
# --------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Every timestamp in the system is timezone-aware UTC. The frontend formats with
# date-fns from ISO-8601 strings; storing naive local times would make commit
# timestamps from different contributors incomparable.

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# Passwords
# --------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --------------------------------------------------------------------------
# Sessions and cookies
# --------------------------------------------------------------------------
# The frontend sends `credentials: "include"` and no Authorization header
# (lib/api/client.ts), so cookie sessions are the contract. httpOnly keeps the
# session out of reach of injected script, which a token in localStorage is not.

SESSION_COOKIE_NAME = "repoguard_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14  # 14 days when "remember me" is chosen
SESSION_EXPIRE_AT_BROWSER_CLOSE = True  # overridden per-session on login
SESSION_ENGINE = "django.contrib.sessions.backends.db"

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
# CSRF rejection happens in middleware, before any view runs, so
# common/exceptions.py never sees it. Without this, a stale CSRF cookie answers
# a JSON API call with Django's HTML 403 page.
CSRF_FAILURE_VIEW = "common.views.csrf_failure"

# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = ["accept", "accept-language", "content-type", "x-request-id"]
# CORS_ALLOW_ALL_ORIGINS is never set. With credentials it is browser-rejected,
# and if it worked it would defeat the entire isolation model.

FRONTEND_URL = env.str("FRONTEND_URL", default="http://localhost:3000")

# --------------------------------------------------------------------------
# Django REST Framework
# --------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "common.authentication.CookieSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "common.renderers.CamelCaseJSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "common.parsers.SnakeCaseJSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "common.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/hour",
        "user": "1000/hour",
        "login": "5/15min",
        "register": "10/hour",
        "analysis": "10/hour",
        "webhook": "200/min",
    },
    "UNAUTHENTICATED_USER": "django.contrib.auth.models.AnonymousUser",
}

# Default permission is IsAuthenticated. Public endpoints opt out explicitly:
# /health/, /health/ready/, /auth/login/, /auth/register/, /webhooks/github/.
# docs/security.md §5.3 enumerates that allow-list in a test.

PUBLIC_ENDPOINT_ALLOWLIST = [
    "/api/v1/health/",
    "/api/v1/health/ready/",
    "/api/v1/auth/login/",
    "/api/v1/auth/register/",
    "/api/v1/webhooks/github/",
]

# --------------------------------------------------------------------------
# Infrastructure
# --------------------------------------------------------------------------

REDIS_URL = env.str("REDIS_URL", default="")
CELERY_BROKER_URL = env.str("CELERY_BROKER_URL", default="")
CELERY_RESULT_BACKEND = env.str("CELERY_RESULT_BACKEND", default="")
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_DEFAULT_QUEUE = "analysis"

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    # Throttles and ETag caching degrade to per-process state without Redis.
    # Correct for a single-process development run; never correct in production,
    # where production.py requires REDIS_URL.
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "repoguard-local",
        }
    }

# --------------------------------------------------------------------------
# GitHub App
# --------------------------------------------------------------------------
# Read with empty defaults here so that Phase 1 runs before an App exists.
# production.py re-reads each one with no default.

GITHUB_APP_ID = env.str("GITHUB_APP_ID", default="")
GITHUB_APP_SLUG = env.str("GITHUB_APP_SLUG", default="")
GITHUB_APP_CLIENT_ID = env.str("GITHUB_APP_CLIENT_ID", default="")
GITHUB_APP_CLIENT_SECRET = env.str("GITHUB_APP_CLIENT_SECRET", default="")
GITHUB_APP_PRIVATE_KEY = env.str("GITHUB_APP_PRIVATE_KEY", default="")
GITHUB_APP_PRIVATE_KEY_PATH = env.str("GITHUB_APP_PRIVATE_KEY_PATH", default="")
GITHUB_WEBHOOK_SECRET = env.str("GITHUB_WEBHOOK_SECRET", default="")
GITHUB_TOKEN_ENCRYPTION_KEY = env.str("GITHUB_TOKEN_ENCRYPTION_KEY", default="")
GITHUB_API_BASE_URL = env.str("GITHUB_API_BASE_URL", default="https://api.github.com")

# --------------------------------------------------------------------------
# Analysis tuning
# --------------------------------------------------------------------------
# Every one of these has a visible product consequence when it bites, and every
# one is reported in the job's stage detail rather than applied silently.
# docs/analysis-pipeline.md §4.3.

HISTORY_DEPTH_DAYS = env.int("HISTORY_DEPTH_DAYS", default=90)
MAX_INITIAL_COMMITS = env.int("MAX_INITIAL_COMMITS", default=1000)
PUSH_COMMIT_LIMIT = env.int("PUSH_COMMIT_LIMIT", default=20)
DIFF_RETENTION_DAYS = env.int("DIFF_RETENTION_DAYS", default=30)
LABEL_MATURITY_DAYS = env.int("LABEL_MATURITY_DAYS", default=90)
JOB_TIMEOUT_MINUTES = env.int("JOB_TIMEOUT_MINUTES", default=60)
MAX_FILE_BYTES = env.int("MAX_FILE_BYTES", default=1_048_576)
MAX_FILES_PER_COMMIT = env.int("MAX_FILES_PER_COMMIT", default=300)
MAX_WEBHOOK_BODY_BYTES = env.int("MAX_WEBHOOK_BODY_BYTES", default=5 * 1024 * 1024)
MODEL_ARTIFACT_DIR = env.str("MODEL_ARTIFACT_DIR", default=str(BASE_DIR / "models"))

DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_WEBHOOK_BODY_BYTES

# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

LOG_LEVEL = env.str("LOG_LEVEL", default="INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "redact": {"()": "common.logging.RedactingFilter"},
    },
    "formatters": {
        "json": {"()": "common.logging.JsonFormatter"},
        "plain": {"format": "%(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["redact"],
            "formatter": "plain",
        },
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django.db.backends": {"level": "WARNING", "propagate": True},
        "repoguard": {"level": LOG_LEVEL, "propagate": True},
    },
}
