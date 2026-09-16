"""Session authentication for a frontend that sends no CSRF token.

``lib/api/client.ts`` sends ``credentials: "include"`` and no ``X-CSRFToken``
header. The frontend is the source of truth for the contract and is not being
modified, so DRF's CSRF enforcement is disabled for API views and cross-site
protection comes from two other layers instead:

* ``SESSION_COOKIE_SAMESITE = "Lax"`` - the browser does not attach the session
  cookie to a cross-site POST/PUT/PATCH/DELETE at all, so the classic
  form-POST-from-evil.com vector arrives unauthenticated.
* ``CORS_ALLOWED_ORIGINS`` is an explicit list with no wildcard, and
  ``CORS_ALLOW_CREDENTIALS`` is on (a wildcard with credentials is rejected by
  browsers regardless).

This is a **documented trade-off, not an oversight**: both defences are
browser-enforced rather than server-enforced. The stronger fix is a two-line
frontend change to send the CSRF token, recorded in docs/api-contract.md §9 and
docs/security.md §4 as the recommended hardening once frontend edits are in
scope.

Django's ``CsrfViewMiddleware`` stays enabled globally - the Django admin is not
served through DRF and keeps full CSRF protection.
"""

from __future__ import annotations

from typing import Any

from rest_framework.authentication import SessionAuthentication


class CookieSessionAuthentication(SessionAuthentication):
    """Session auth without DRF's CSRF check. See module docstring."""

    def enforce_csrf(self, request: Any) -> None:
        return None
