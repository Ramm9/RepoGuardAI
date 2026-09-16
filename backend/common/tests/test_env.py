"""Environment variable reading.

One rule carries the weight: **a name with no default raises.** Everything else
here is parsing. ``env.str("GITHUB_WEBHOOK_SECRET")`` with the variable absent
must stop the process, because the alternative - an empty string that HMAC
happily signs with - is a service that accepts forged webhooks and reports itself
healthy.
"""

from __future__ import annotations

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from common.env import Env


class NoDefaultTests(SimpleTestCase):
    def test_missing_without_default_raises(self):
        env = Env({})

        with self.assertRaises(ImproperlyConfigured) as ctx:
            env.str("GITHUB_WEBHOOK_SECRET")

        self.assertIn("GITHUB_WEBHOOK_SECRET", str(ctx.exception))

    def test_every_reader_enforces_it(self):
        env = Env({})

        for reader in (env.str, env.bool, env.int, env.float, env.list, env.db_url):
            with self.subTest(reader=reader.__name__):
                with self.assertRaises(ImproperlyConfigured):
                    reader("ABSENT")

    def test_explicit_none_default_is_honoured(self):
        # None is a legitimate default. Only *absence* of a default raises.
        self.assertIsNone(Env({}).str("ABSENT", default=None))

    def test_empty_string_in_the_environment_is_a_value_not_a_default(self):
        self.assertEqual(Env({"X": ""}).str("X", default="fallback"), "")


class ParsingTests(SimpleTestCase):
    def test_str(self):
        self.assertEqual(Env({"X": "value"}).str("X"), "value")

    def test_bool_truthy_and_falsy(self):
        for raw in ("1", "true", "TRUE", "yes", "on", "y", "t"):
            self.assertIs(Env({"X": raw}).bool("X"), True, raw)
        for raw in ("0", "false", "FALSE", "no", "off", "n", "f"):
            self.assertIs(Env({"X": raw}).bool("X"), False, raw)

    def test_bool_rejects_ambiguity(self):
        # DEBUG=maybe must not quietly become True.
        with self.assertRaises(ImproperlyConfigured):
            Env({"DEBUG": "maybe"}).bool("DEBUG")

    def test_int_and_float(self):
        self.assertEqual(Env({"X": " 42 "}).int("X"), 42)
        self.assertEqual(Env({"X": "1.5"}).float("X"), 1.5)

    def test_int_rejects_garbage(self):
        with self.assertRaises(ImproperlyConfigured):
            Env({"X": "1.5"}).int("X")

    def test_list_splits_and_strips(self):
        self.assertEqual(
            Env({"X": "http://a, http://b ,"}).list("X"), ["http://a", "http://b"]
        )

    def test_list_default_passes_through_unparsed(self):
        default = ["http://localhost:3000"]
        self.assertIs(Env({}).list("X", default=default), default)


class DbUrlTests(SimpleTestCase):
    def test_postgres(self):
        config = Env({"DATABASE_URL": "postgres://user:pw@db:5432/repoguard"}).db_url()

        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "repoguard")
        self.assertEqual(config["USER"], "user")
        self.assertEqual(config["PASSWORD"], "pw")
        self.assertEqual(config["HOST"], "db")
        self.assertEqual(config["PORT"], "5432")

    def test_postgres_percent_encoded_password(self):
        config = Env({"DATABASE_URL": "postgres://u:p%40ss%2Fword@db:5432/x"}).db_url()

        self.assertEqual(config["PASSWORD"], "p@ss/word")

    def test_sqlite(self):
        config = Env({"DATABASE_URL": "sqlite:///var/lib/repoguard/x.sqlite3"}).db_url()

        self.assertEqual(config["ENGINE"], "django.db.backends.sqlite3")
        self.assertEqual(config["NAME"], "/var/lib/repoguard/x.sqlite3")

    def test_unsupported_scheme_raises_rather_than_guessing(self):
        # Falling back to SQLite because a production URL failed to parse is how
        # a deploy ends up writing to a file nobody backs up.
        with self.assertRaises(ImproperlyConfigured):
            Env({"DATABASE_URL": "mysql://u:p@h/db"}).db_url()

    def test_dict_default_passes_through(self):
        default = {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}
        self.assertIs(Env({}).db_url("DATABASE_URL", default=default), default)


class ReadEnvTests(SimpleTestCase):
    def _write(self, content: str):
        import tempfile

        handle = tempfile.NamedTemporaryFile("w", suffix=".env", delete=False)
        handle.write(content)
        handle.close()
        self.addCleanup(lambda: __import__("os").unlink(handle.name))
        return handle.name

    def test_parses_comments_quotes_and_export(self):
        path = self._write(
            "# a comment\n"
            "\n"
            "PLAIN=value\n"
            'QUOTED="quoted value"\n'
            "SINGLE='single'\n"
            "export EXPORTED=exported\n"
            "EMPTY=\n"
            "WITH_EQUALS=a=b\n"
            "not a pair\n"
        )
        environ: dict[str, str] = {}
        Env(environ).read_env(path)

        self.assertEqual(environ["PLAIN"], "value")
        self.assertEqual(environ["QUOTED"], "quoted value")
        self.assertEqual(environ["SINGLE"], "single")
        self.assertEqual(environ["EXPORTED"], "exported")
        self.assertEqual(environ["EMPTY"], "")
        self.assertEqual(environ["WITH_EQUALS"], "a=b")
        self.assertNotIn("not a pair", environ)

    def test_existing_environment_wins(self):
        # A value injected by a secret manager must not be overridden by a stale
        # .env left in the working tree.
        path = self._write("SECRET=from-file\n")
        environ = {"SECRET": "from-the-real-environment"}
        Env(environ).read_env(path)

        self.assertEqual(environ["SECRET"], "from-the-real-environment")

    def test_missing_file_is_not_an_error(self):
        environ: dict[str, str] = {}
        Env(environ).read_env("/nonexistent/path/.env")

        self.assertEqual(environ, {})
