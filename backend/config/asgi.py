"""ASGI entry point.

Present for completeness. The deployment runs WSGI/gunicorn: nothing in the
contract is long-lived or streaming - analysis progress is polled by TanStack
Query, not pushed over a socket (docs/api-contract.md §6).
"""

from __future__ import annotations

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

application = get_asgi_application()
