"""Case conversion at the JSON boundary.

The rule under test throughout: **only keys are converted, never values.** The
health endpoint depends on it directly - ``"status": "not_configured"`` must
survive as written, because the frontend compares that string literally.
"""

from __future__ import annotations

import io
import json

from django.test import SimpleTestCase

from common.case import (
    PreserveKeys,
    camelize,
    to_camel_case,
    to_snake_case,
    underscoreize,
)
from common.parsers import SnakeCaseJSONParser
from common.renderers import CamelCaseJSONRenderer


class ToCamelCaseTests(SimpleTestCase):
    def test_converts_snake_case(self):
        self.assertEqual(to_camel_case("repository_ids"), "repositoryIds")
        self.assertEqual(to_camel_case("model_version"), "modelVersion")
        self.assertEqual(to_camel_case("last_analyzed_at"), "lastAnalyzedAt")

    def test_idempotent_on_camel_case(self):
        self.assertEqual(to_camel_case("repositoryIds"), "repositoryIds")
        self.assertEqual(to_camel_case(to_camel_case("repository_ids")), "repositoryIds")

    def test_single_word_unchanged(self):
        self.assertEqual(to_camel_case("count"), "count")
        self.assertEqual(to_camel_case(""), "")

    def test_leading_underscore_preserved(self):
        self.assertEqual(to_camel_case("_private_field"), "_privateField")
        self.assertEqual(to_camel_case("__dunder_ish"), "__dunderIsh")

    def test_trailing_and_double_underscores(self):
        self.assertEqual(to_camel_case("value_"), "value")
        self.assertEqual(to_camel_case("a__b"), "aB")


class ToSnakeCaseTests(SimpleTestCase):
    def test_converts_camel_case(self):
        self.assertEqual(to_snake_case("repositoryIds"), "repository_ids")
        self.assertEqual(to_snake_case("riskScore"), "risk_score")

    def test_idempotent_on_snake_case(self):
        self.assertEqual(to_snake_case("repository_ids"), "repository_ids")

    def test_acronyms_collapse(self):
        # The trap this exists to avoid: "avatar_u_r_l".
        self.assertEqual(to_snake_case("avatarURL"), "avatar_url")
        self.assertEqual(to_snake_case("HTTPResponse"), "http_response")
        self.assertEqual(to_snake_case("prURL"), "pr_url")

    def test_digits(self):
        self.assertEqual(to_snake_case("sha1Hash"), "sha1_hash")


class CamelizeTests(SimpleTestCase):
    def test_nested_structures(self):
        data = {
            "risk_score": 72,
            "top_files": [{"file_path": "a.py", "risk_score": 90}],
            "meta": {"model_version": None},
        }
        self.assertEqual(
            camelize(data),
            {
                "riskScore": 72,
                "topFiles": [{"filePath": "a.py", "riskScore": 90}],
                "meta": {"modelVersion": None},
            },
        )

    def test_values_are_never_converted(self):
        # A value that *looks* like a key must survive byte-for-byte. The health
        # endpoint's "not_configured" and HealthComponent.key both rely on this.
        data = {"component_key": "code_quality", "status": "not_configured"}
        self.assertEqual(
            camelize(data), {"componentKey": "code_quality", "status": "not_configured"}
        )

    def test_preserve_keys_opts_out(self):
        # File paths are data. Camelizing "src/risk_engine.py" corrupts it.
        data = {"per_file": PreserveKeys({"src/risk_engine.py": 4, "a_b/c_d.py": 1})}
        result = camelize(data)
        self.assertEqual(sorted(result["perFile"]), ["a_b/c_d.py", "src/risk_engine.py"])

    def test_non_string_keys_left_alone(self):
        self.assertEqual(camelize({1: "a", None: "b"}), {1: "a", None: "b"})

    def test_scalars_pass_through(self):
        for value in (None, 1, 1.5, True, "a_b", [1, 2]):
            self.assertEqual(camelize(value), value)


class UnderscoreizeTests(SimpleTestCase):
    def test_request_body_normalised(self):
        self.assertEqual(
            underscoreize({"repositoryIds": [1, 2], "branch": "main"}),
            {"repository_ids": [1, 2], "branch": "main"},
        )

    def test_snake_case_body_unchanged(self):
        # services/onboarding.ts already posts snake_case; it must pass through.
        body = {"repository_ids": [1, 2], "branch": "main"}
        self.assertEqual(underscoreize(body), body)

    def test_values_are_never_converted(self):
        self.assertEqual(underscoreize({"branchName": "featureBranch"})["branch_name"],
                         "featureBranch")


class RendererTests(SimpleTestCase):
    def test_renders_camel_case(self):
        payload = CamelCaseJSONRenderer().render({"model_version": None, "risk_score": 72})
        self.assertEqual(json.loads(payload), {"modelVersion": None, "riskScore": 72})

    def test_renders_list_root(self):
        payload = CamelCaseJSONRenderer().render([{"full_name": "o/r"}])
        self.assertEqual(json.loads(payload), [{"fullName": "o/r"}])


class ParserTests(SimpleTestCase):
    def test_parses_to_snake_case(self):
        stream = io.BytesIO(b'{"repositoryIds": [1], "branch": "main"}')
        self.assertEqual(
            SnakeCaseJSONParser().parse(stream),
            {"repository_ids": [1], "branch": "main"},
        )

    def test_round_trip_is_stable(self):
        original = {"repository_ids": [1], "branch": "main"}
        stream = io.BytesIO(CamelCaseJSONRenderer().render(original))
        self.assertEqual(SnakeCaseJSONParser().parse(stream), original)
