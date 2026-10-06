import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any, cast
from unittest.mock import Mock, patch

import httpx
import instructor
from openai import OpenAI
from pydantic import HttpUrl, ValidationError

from scripts.intelligence.cli import main
from scripts.intelligence.extractor import (
    ConfigurationError,
    ExtractionError,
    create_client,
    extract_intelligence,
)
from scripts.intelligence.models import IntelligenceItem
from scripts.models import Article

ROOT = Path(__file__).resolve().parents[2]


def valid_intelligence(**overrides):
    return {
        "title": "Investigation reported",
        "summary": "Authorities reported an investigation.",
        "description": "Authorities reported an investigation into alleged abuse.",
        "exploitation_type": [],
        "platform": [],
        "technology": [],
        "affected_population": [],
        "offender_tactic": [],
        "geography": [],
        "intel_type": [],
        **overrides,
    }


class ModelTests(unittest.TestCase):
    def test_classifications_are_required_but_can_be_empty(self):
        self.assertEqual(IntelligenceItem(**valid_intelligence()).platform, [])
        for field in list(valid_intelligence())[3:]:
            with self.subTest(field=field):
                data = valid_intelligence()
                del data[field]
                with self.assertRaises(ValidationError):
                    IntelligenceItem(**data)

    def test_invalid_enum_rejected(self):
        with self.assertRaises(ValidationError):
            IntelligenceItem(**valid_intelligence(platform=["invented platform"]))

    def test_duplicates_removed_without_losing_order_or_distinct_geography(self):
        ontario = {"country": "Canada", "state_or_jurisdiction": "Ontario"}
        quebec = {"country": "Canada", "state_or_jurisdiction": "Quebec"}
        item = IntelligenceItem(
            **valid_intelligence(
                platform=["Telegram", "Discord", "Telegram"],
                geography=[ontario, ontario, quebec],
            )
        )
        self.assertEqual(item.platform, ["Telegram", "Discord"])
        self.assertEqual(
            [g.state_or_jurisdiction for g in item.geography], ["Ontario", "Quebec"]
        )

    def test_blank_article_rejected_without_rewriting_source(self):
        with self.assertRaises(ValidationError):
            Article(url=HttpUrl("https://example.com"), article_text=" \n\t")
        text = "  Original text.\n"
        self.assertEqual(
            Article(url=HttpUrl("https://example.com"), article_text=text).article_text,
            text,
        )

    def test_missing_article_metadata_is_allowed(self):
        article = Article(url=HttpUrl("https://example.com"), article_text="Example.")
        self.assertIsNone(article.author)
        self.assertIsNone(article.published_at)


class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.article = Article(
            url=HttpUrl("https://example.com"), article_text="An offline investigation."
        )
        self.requests = []

    def make_client(self, outputs, status=200, raw_body=None, initial_error=None):
        def respond(request):
            self.requests.append(json.loads(request.content))
            if initial_error is not None and len(self.requests) == 1:
                return httpx.Response(400, json=initial_error)
            index = len(self.requests) - 1 - (initial_error is not None)
            content = outputs[min(index, len(outputs) - 1)]
            body = (
                raw_body
                if raw_body is not None
                else {
                    "id": "response-test",
                    "object": "chat.completion",
                    "created": 0,
                    "model": "actual-test-model",
                    "choices": [
                        {
                            "index": 0,
                            "finish_reason": "stop",
                            "message": {"role": "assistant", "content": content},
                        }
                    ],
                }
            )
            return httpx.Response(status, json=body)

        http = self.enterContext(httpx.Client(transport=httpx.MockTransport(respond)))
        return instructor.from_openai(
            OpenAI(
                api_key="test-placeholder", http_client=cast(Any, http), max_retries=0
            ),
            mode=instructor.Mode.JSON_SCHEMA,
        )

    def extract(self, client):
        return extract_intelligence(
            self.article, client=client, model="requested-test-model"
        )

    def test_success_preserves_source_without_extraction_metadata(self):
        result = self.extract(self.make_client([json.dumps(valid_intelligence())]))
        self.assertEqual(result.article, self.article)
        self.assertEqual(set(result.model_dump()), {"article", "intelligence"})
        request = self.requests[0]
        self.assertEqual(request["response_format"]["type"], "json_schema")
        self.assertTrue(request["provider"]["require_parameters"])

    def test_malformed_json_fails_after_bounded_retries(self):
        with self.assertRaises(ExtractionError):
            self.extract(self.make_client(["{"]))
        self.assertEqual(len(self.requests), 4)

    def json_only_error(self):
        return {
            "error": {
                "message": "Provider returned error",
                "code": 400,
                "metadata": {
                    "raw": json.dumps(
                        {
                            "message": "Model 'example' does not support 'json_schema' response format. Supported formats: json_object."
                        }
                    )
                },
            }
        }

    def test_json_only_provider_falls_back_and_still_validates(self):
        client = self.make_client(
            ["{}", json.dumps(valid_intelligence())],
            initial_error=self.json_only_error(),
        )
        result = self.extract(client)
        self.assertEqual(result.article, self.article)
        self.assertEqual(
            [request["response_format"]["type"] for request in self.requests],
            ["json_schema", "json_object", "json_object"],
        )
        self.assertTrue(
            all(request["model"] == "requested-test-model" for request in self.requests)
        )
        self.assertEqual(client.mode, instructor.Mode.JSON_SCHEMA)

    def test_json_fallback_rejects_persistently_invalid_output(self):
        client = self.make_client(["{}"], initial_error=self.json_only_error())
        with self.assertRaises(ExtractionError):
            self.extract(client)
        self.assertEqual(len(self.requests), 5)

    def test_unrelated_bad_request_does_not_trigger_fallback(self):
        client = self.make_client(
            [""],
            status=400,
            raw_body={"error": {"message": "Invalid schema", "code": 400}},
        )
        with self.assertRaises(ExtractionError):
            self.extract(client)
        self.assertEqual(len(self.requests), 1)

    def test_format_fallback_is_attempted_only_once(self):
        error = self.json_only_error()
        client = self.make_client([""], status=400, raw_body=error, initial_error=error)
        with self.assertRaises(ExtractionError):
            self.extract(client)
        self.assertEqual(len(self.requests), 2)

    def test_omitted_classification_is_retried(self):
        data = valid_intelligence()
        del data["affected_population"]
        self.extract(
            self.make_client([json.dumps(data), json.dumps(valid_intelligence())])
        )
        self.assertEqual(len(self.requests), 2)

    def test_rate_limit_fails_with_clear_message(self):
        client = self.make_client(
            [""],
            status=429,
            raw_body={"error": {"message": "Rate limited", "code": 429}},
        )
        with self.assertRaisesRegex(ExtractionError, "429"):
            self.extract(client)

    def test_no_choices_fails_gracefully(self):
        client = self.make_client([""], raw_body={"id": "test", "choices": None})
        with self.assertRaises(ExtractionError):
            self.extract(client)

    def test_programming_error_is_not_mislabeled_as_network_error(self):
        client = Mock()
        client.chat.completions.create.side_effect = TypeError("Programming bug")
        with self.assertRaisesRegex(TypeError, "Programming bug"):
            self.extract(client)


class ConfigurationAndCliTests(unittest.TestCase):
    def article_path(self) -> Path:
        directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        path = directory / "article.json"
        article = Article(
            url="https://example.com/article", article_text="Example article."
        )
        path.write_text(article.model_dump_json(), encoding="utf-8")
        return path

    def test_missing_credentials_fail_explicitly(self):
        for key in (None, "", "   "):
            with self.subTest(key=key), self.assertRaises(ConfigurationError):
                create_client(key)

    def test_import_does_not_create_client_or_load_credentials(self):
        code = """from unittest.mock import patch
with patch('openai.OpenAI', side_effect=AssertionError('Unexpected client creation')):
    import scripts.intelligence.extractor
    import scripts.intelligence.cli
"""
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_cli_failure_exits_nonzero(self):
        article_path = self.article_path()
        code = f"""import runpy
import sys
from unittest.mock import patch
from scripts.intelligence.extractor import ExtractionError
sys.argv = ['scripts.intelligence.cli', {str(article_path)!r}]
with patch('scripts.intelligence.extractor.create_client'), patch('dotenv.load_dotenv'), patch('scripts.intelligence.extractor.extract_intelligence', side_effect=ExtractionError('Test failure')):
    runpy.run_module('scripts.intelligence.cli', run_name='__main__')
"""
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("Test failure", result.stderr)
        self.assertEqual(result.stdout, "")

    def test_cli_success_prints_json_and_closes_client(self):
        client = Mock()
        result = Mock()
        result.model_dump_json.return_value = '{"result": "ok"}'
        with (
            patch("scripts.intelligence.cli.load_dotenv"),
            patch.dict(os.environ, {}, clear=True),
            patch("scripts.intelligence.cli.create_client", return_value=client),
            patch(
                "scripts.intelligence.cli.extract_intelligence", return_value=result
            ) as extract,
        ):
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(main(self.article_path()), 0)
            self.assertEqual(json.loads(output.getvalue()), {"result": "ok"})
            self.assertNotIn("model", extract.call_args.kwargs)
            client.client.close.assert_called_once()

    def test_cli_missing_credentials_or_input_returns_failure(self):
        with (
            patch("scripts.intelligence.cli.load_dotenv"),
            patch.dict(os.environ, {}, clear=True),
        ):
            self.assertEqual(main(self.article_path()), 1)
            self.assertEqual(main(Path("/does-not-exist/article.json")), 1)


if __name__ == "__main__":
    unittest.main()
