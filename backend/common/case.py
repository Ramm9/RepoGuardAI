"""snake_case <-> camelCase conversion for the JSON boundary.

A deliberately small replacement for ``djangorestframework-camel-case``, written
in-house for three reasons:

1. **Exact control over what is converted.** Only *keys* are touched. Values are
   never modified, which is what lets ``HealthComponent.key = "codeQuality"`` be
   emitted literally as a value while every surrounding key is camelized.
2. **Explicit opt-out.** Wrapping a mapping in :class:`PreserveKeys` passes it
   through untouched. Needed wherever keys are data rather than field names -
   file paths in a provenance map, for example, where camelizing
   ``src/risk_engine.py`` would corrupt it.
3. **No dependency.** The package is not installable in this environment
   (see the Phase 1 report), and the conversion is 40 lines.

The convention, from docs/api-contract.md §1.3:

* Responses are camelCase - the frontend's TypeScript types expect it.
* Request bodies are snake_case - ``services/onboarding.ts`` sends
  ``{repository_ids, branch}``.
* Query parameters accept both (``page_size`` and ``pageSize``).
* Error field-error keys are camelized, so a serializer error on
  ``repository_ids`` reaches the frontend as ``repositoryIds`` and matches the
  form field name that ``applyFieldErrors`` looks for.
"""

from __future__ import annotations

import re
from typing import Any

__all__ = ["PreserveKeys", "camelize", "to_camel_case", "to_snake_case", "underscoreize"]


class PreserveKeys(dict):
    """A mapping whose keys are data, not field names.

    Neither :func:`camelize` nor :func:`underscoreize` rewrites the keys of a
    ``PreserveKeys`` instance, at any depth.
    """


_ACRONYM_BOUNDARY = re.compile(r"([A-Z]+)([A-Z][a-z])")
_WORD_BOUNDARY = re.compile(r"([a-z\d])([A-Z])")


def to_camel_case(name: str) -> str:
    """``repository_ids`` -> ``repositoryIds``. Idempotent on camelCase input.

    Leading underscores are preserved so private keys stay recognisable.
    """
    if "_" not in name:
        return name
    stripped = name.lstrip("_")
    prefix = name[: len(name) - len(stripped)]
    head, *rest = stripped.split("_")
    return prefix + head + "".join(part[:1].upper() + part[1:] for part in rest)


def to_snake_case(name: str) -> str:
    """``repositoryIds`` -> ``repository_ids``. Idempotent on snake_case input.

    Acronyms collapse correctly: ``avatarURL`` -> ``avatar_url``,
    ``HTTPResponse`` -> ``http_response``.
    """
    partial = _ACRONYM_BOUNDARY.sub(r"\1_\2", name)
    return _WORD_BOUNDARY.sub(r"\1_\2", partial).lower()


def _convert(data: Any, key_fn) -> Any:
    if isinstance(data, PreserveKeys):
        return data
    if isinstance(data, dict):
        return {
            key_fn(k) if isinstance(k, str) else k: _convert(v, key_fn) for k, v in data.items()
        }
    if isinstance(data, list | tuple):
        converted = [_convert(item, key_fn) for item in data]
        return type(data)(converted) if isinstance(data, tuple) else converted
    return data


def camelize(data: Any) -> Any:
    """Recursively camelCase every mapping key. Values are untouched."""
    return _convert(data, to_camel_case)


def underscoreize(data: Any) -> Any:
    """Recursively snake_case every mapping key. Values are untouched."""
    return _convert(data, to_snake_case)
