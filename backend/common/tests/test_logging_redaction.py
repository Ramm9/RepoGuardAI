"""Secret redaction in logs.

The threat is mundane: someone adds ``logger.debug("token=%s", token)`` during an
incident and it ships. Redaction therefore happens on the **record**, inside a
filter attached to the handler, not at the call site - because relying on every
future call site to remember is exactly how secrets end up in logs.

Two independent mechanisms, both tested here:

* key-based - any key that *names* a credential has its value replaced;
* value-based - anything credential-shaped is replaced wherever it appears,
  including inside an otherwise innocent free-text message.
"""

from __future__ import annotations

import json
import logging

from django.test import SimpleTestCase

from common.logging import REDACTED, JsonFormatter, RedactingFilter, redact

GITHUB_TOKEN = "ghp_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"  # fake, shape-accurate
INSTALLATION_TOKEN = "ghs_" + "Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2"
PAT = "github_pat_" + "11ABCDEFG0abcdefghijklmnopqrstuvwxyz0123456789"
PEM = (
    "-----BEGIN RSA PRIVATE KEY-----\n"
    "MIIEowIBAAKCAQEAxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n"
    "-----END RSA PRIVATE KEY-----"
)


def _record(msg, args=(), **extra):
    record = logging.LogRecord("repoguard.test", logging.INFO, __file__, 1, msg, args, None)
    for key, value in extra.items():
        setattr(record, key, value)
    return record


class RedactByKeyTests(SimpleTestCase):
    def test_credential_named_keys_are_replaced(self):
        data = {
            "access_token": "anything at all",
            "webhook_secret": "s",
            "password": "hunter2",
            "api_key": "k",
            "encryption_key": "k",
            "private_key": "k",
            "Authorization": "Basic abc",
            "session_key": "k",
            "x_hub_signature": "sha256=deadbeef",
        }
        result = redact(data)

        for key in data:
            with self.subTest(key=key):
                self.assertEqual(result[key], REDACTED)

    def test_innocent_keys_survive(self):
        data = {"repository_id": 42, "sha": "abc123", "branch": "main", "risk_score": 72}
        self.assertEqual(redact(data), data)

    def test_nested_and_listed_structures(self):
        data = {"connections": [{"login": "octocat", "access_token": GITHUB_TOKEN}]}
        result = redact(data)

        self.assertEqual(result["connections"][0]["login"], "octocat")
        self.assertEqual(result["connections"][0]["access_token"], REDACTED)

    def test_recursion_is_bounded(self):
        # A cyclic or pathologically deep structure must not hang the logger.
        deep: dict = {}
        node = deep
        for _ in range(50):
            node["next"] = {}
            node = node["next"]
        node["access_token"] = GITHUB_TOKEN

        redact(deep)  # must return rather than recurse to the stack limit


class RedactByValueTests(SimpleTestCase):
    def test_credential_shaped_literals_in_free_text(self):
        for secret in (GITHUB_TOKEN, INSTALLATION_TOKEN, PAT, PEM):
            with self.subTest(secret=secret[:12]):
                message = f"GitHub call failed using {secret} for installation 1"
                self.assertNotIn(secret, redact(message))
                self.assertIn(REDACTED, redact(message))

    def test_bearer_header_value(self):
        self.assertNotIn("abcdefghijklmnop", redact("Authorization: Bearer abcdefghijklmnop"))

    def test_webhook_signature(self):
        signature = "sha256=" + "a" * 64
        self.assertNotIn(signature, redact(f"rejected signature {signature}"))

    def test_ordinary_text_untouched(self):
        message = "Analysis finished for repository 42 in 3.2s"
        self.assertEqual(redact(message), message)

    def test_a_commit_sha_is_not_mistaken_for_a_secret(self):
        # 40 hex characters is a commit SHA, not a credential. Over-redaction
        # would make the logs useless for the thing they exist for.
        message = "commit 9f4a1c2d3e5b6a7f8c9d0e1f2a3b4c5d6e7f8a9b analysed"
        self.assertEqual(redact(message), message)


class RedactingFilterTests(SimpleTestCase):
    def setUp(self):
        self.filter = RedactingFilter()

    def test_scrubs_the_message(self):
        record = _record(f"token {GITHUB_TOKEN}")
        self.filter.filter(record)

        self.assertNotIn(GITHUB_TOKEN, record.getMessage())

    def test_scrubs_interpolated_args(self):
        # The naive failure mode: msg is a clean format string, the secret is in
        # args, and only msg gets scrubbed.
        record = _record("calling GitHub with %s", (GITHUB_TOKEN,))
        self.filter.filter(record)

        self.assertNotIn(GITHUB_TOKEN, record.getMessage())

    def test_scrubs_dict_args(self):
        record = _record("ctx %(access_token)s", ({"access_token": GITHUB_TOKEN},))
        self.filter.filter(record)

        self.assertNotIn(GITHUB_TOKEN, record.getMessage())

    def test_scrubs_structured_extras(self):
        record = _record("request", context={"webhook_secret": "s", "path": "/x"})
        self.filter.filter(record)

        self.assertEqual(record.context["webhook_secret"], REDACTED)
        self.assertEqual(record.context["path"], "/x")

    def test_returns_true_so_the_record_is_still_emitted(self):
        self.assertTrue(self.filter.filter(_record("hello")))


class JsonFormatterTests(SimpleTestCase):
    def test_emits_the_audit_fields(self):
        record = _record(
            "GET /api/v1/health/ 200",
            request_id="abc123",
            user_id="7",
            path="/api/v1/health/",
            method="GET",
            status=200,
            duration_ms=12.5,
        )
        payload = json.loads(JsonFormatter().format(record))

        self.assertEqual(payload["request_id"], "abc123")
        self.assertEqual(payload["user_id"], "7")
        self.assertEqual(payload["method"], "GET")
        self.assertEqual(payload["status"], 200)
        self.assertEqual(payload["duration_ms"], 12.5)
        self.assertEqual(payload["level"], "INFO")

    def test_absent_fields_are_omitted_not_nulled(self):
        payload = json.loads(JsonFormatter().format(_record("bare")))

        self.assertNotIn("user_id", payload)
        self.assertEqual(payload["message"], "bare")

    def test_output_is_one_line(self):
        record = _record("multi\nline")
        self.assertNotIn("\n", JsonFormatter().format(record))


class HandlerIntegrationTests(SimpleTestCase):
    """The filter must be reachable through settings, not just importable."""

    def test_console_handler_has_the_redact_filter(self):
        from django.conf import settings

        self.assertIn("redact", settings.LOGGING["handlers"]["console"]["filters"])
        self.assertEqual(
            settings.LOGGING["filters"]["redact"]["()"], "common.logging.RedactingFilter"
        )

    def test_secret_does_not_reach_the_stream(self):
        stream_records = []

        class Capture(logging.Handler):
            def emit(self, record):
                stream_records.append(self.format(record))

        handler = Capture()
        handler.addFilter(RedactingFilter())
        handler.setFormatter(JsonFormatter())
        logger = logging.getLogger("repoguard.test.redaction")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
        try:
            logger.info("exchanging code for %s", GITHUB_TOKEN)
        finally:
            logger.removeHandler(handler)
            logger.propagate = True

        self.assertEqual(len(stream_records), 1)
        self.assertNotIn(GITHUB_TOKEN, stream_records[0])
