"""Environment variable access.

A deliberately small replacement for ``django-environ``.

The one rule that matters: **a secret has no default**. ``env.str("X")`` with no
``default`` raises ``ImproperlyConfigured`` at import time rather than falling
back to something permissive. A missing ``GITHUB_WEBHOOK_SECRET`` must crash the
process, not silently disable signature verification.

See docs/security.md §2.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

_UNSET = object()

_TRUE = {"1", "true", "yes", "on", "y", "t"}
_FALSE = {"0", "false", "no", "off", "n", "f"}


class Env:
    """Reads configuration from ``os.environ``, with optional ``.env`` seeding."""

    def __init__(self, environ: dict[str, str] | None = None) -> None:
        self._environ = environ if environ is not None else os.environ

    # -- loading ---------------------------------------------------------

    def read_env(self, path: str | Path) -> None:
        """Seed ``os.environ`` from a ``.env`` file.

        Existing environment variables always win: a value exported in the
        shell or injected by a secret manager must not be overridden by a
        stale file left in the working tree.
        """
        p = Path(path)
        if not p.is_file():
            return
        for raw in p.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export ") :].lstrip()
            key, sep, value = line.partition("=")
            if not sep:
                continue
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            self._environ.setdefault(key, value)

    # -- readers ---------------------------------------------------------

    def _get(self, name: str, default: Any) -> Any:
        try:
            return self._environ[name]
        except KeyError:
            if default is _UNSET:
                raise ImproperlyConfigured(
                    f"Set the {name} environment variable. "
                    f"It has no default by design - see docs/security.md."
                ) from None
            return default

    def str(self, name: str, default: Any = _UNSET) -> Any:
        value = self._get(name, default)
        return value if value is default else str(value)

    def bool(self, name: str, default: Any = _UNSET) -> Any:
        value = self._get(name, default)
        if not isinstance(value, str):
            return value
        lowered = value.strip().lower()
        if lowered in _TRUE:
            return True
        if lowered in _FALSE:
            return False
        raise ImproperlyConfigured(f"{name}={value!r} is not a valid boolean.")

    def int(self, name: str, default: Any = _UNSET) -> Any:
        value = self._get(name, default)
        if not isinstance(value, str):
            return value
        try:
            return int(value.strip())
        except ValueError:
            raise ImproperlyConfigured(f"{name}={value!r} is not a valid integer.") from None

    def float(self, name: str, default: Any = _UNSET) -> Any:
        value = self._get(name, default)
        if not isinstance(value, str):
            return value
        try:
            return float(value.strip())
        except ValueError:
            raise ImproperlyConfigured(f"{name}={value!r} is not a valid float.") from None

    def list(self, name: str, default: Any = _UNSET) -> Any:
        value = self._get(name, default)
        if not isinstance(value, str):
            return value
        return [item.strip() for item in value.split(",") if item.strip()]

    # -- composite -------------------------------------------------------

    def db_url(self, name: str = "DATABASE_URL", default: Any = _UNSET) -> dict[str, Any]:
        """Parse a database URL into a Django ``DATABASES`` entry.

        Supports ``postgres://``/``postgresql://`` and ``sqlite://``. Anything
        else is an error rather than a guess - silently falling back to SQLite
        because a URL failed to parse is how a production deploy ends up
        writing to a file nobody backs up.
        """
        url = self._get(name, default)
        if url is default and not isinstance(url, str):
            return url

        parsed = urlparse(url)
        scheme = parsed.scheme.lower()

        if scheme in {"sqlite", "sqlite3"}:
            # sqlite:///absolute/path or sqlite://:memory:
            path = url.split("://", 1)[1]
            return {"ENGINE": "django.db.backends.sqlite3", "NAME": path or ":memory:"}

        if scheme in {"postgres", "postgresql", "psql"}:
            return {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": unquote(parsed.path.lstrip("/")),
                "USER": unquote(parsed.username or ""),
                "PASSWORD": unquote(parsed.password or ""),
                "HOST": parsed.hostname or "",
                "PORT": str(parsed.port or ""),
            }

        raise ImproperlyConfigured(
            f"{name} uses unsupported scheme {scheme!r}. "
            f"Use postgres:// (production) or sqlite:// (local/test)."
        )


env = Env()
