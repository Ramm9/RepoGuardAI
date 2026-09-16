"""URL configuration.

Everything the frontend calls lives under ``/api/v1/``. ``lib/api/client.ts``
builds request URLs as ``${NEXT_PUBLIC_API_URL}${path}`` with
``NEXT_PUBLIC_API_URL`` defaulting to ``http://localhost:8000/api/v1`` and every
service passing a leading-slash path, so the prefix is part of the contract - it
is not a convention this backend is free to change.

Domain URLconfs are included as their phase lands. The commented roadmap below is
kept in sync with ``LOCAL_APPS`` in ``config/settings/base.py`` so that the two
never drift.
"""

from __future__ import annotations

from django.contrib import admin
from django.urls import include, path, re_path

from common.views import api_not_found

API = "api/v1/"

urlpatterns = [
    path("admin/", admin.site.urls),
    path(API, include("common.urls")),
    # path(API + "auth/",         include("users.urls")),            # Phase 3
    # path(API + "github/",       include("github.urls")),           # Phase 4
    # path(API + "webhooks/",     include("github.webhook_urls")),   # Phase 5
    # path(API + "repositories/", include("repositories.urls")),     # Phase 7
    # path(API + "commits/",      include("commits.urls")),          # Phase 8
    # path(API + "pull-requests/", include("pull_requests.urls")),   # Phase 8
    # path(API + "analysis/",     include("analysis.urls")),         # Phase 6
    # path(API + "analytics/",    include("analytics.urls")),        # Phase 16
    # path(API + "alerts/",       include("alerts.urls")),           # Phase 15
    # path(API + "settings/",     include("users.settings_urls")),   # Phase 3
    # Must stay last: anything under the API prefix that no domain URLconf
    # claimed answers with the JSON error contract rather than Django's HTML
    # 404. New includes go above this line.
    re_path(r"^" + API, api_not_found),
]

#: Django's own error handlers render HTML. These keep anything under /api/ in
#: the JSON error contract instead - see common/views.py for why each matters.
handler400 = "common.views.bad_request"
handler403 = "common.views.permission_denied"
handler500 = "common.views.server_error"


