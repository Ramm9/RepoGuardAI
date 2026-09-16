"""App config for the shared infrastructure package.

``common`` holds cross-cutting machinery only - case conversion, the error
contract, pagination, logging, health. It owns no models and no domain logic.
The rule that keeps the modular monolith honest (docs/architecture.md §3): domain
apps may import ``common``; ``common`` may never import a domain app.
"""

from __future__ import annotations

from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "common"
    verbose_name = "Common infrastructure"
