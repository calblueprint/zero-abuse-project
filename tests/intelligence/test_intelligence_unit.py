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
from scripts.intelligence.enums import USRegion
from scripts.intelligence.extractor import (
    ConfigurationError,
    ExtractionError,
    create_client,
    extract_intelligence,
)
from scripts.intelligence.models import (
    ExtractedLocation,
    IntelligenceItem,
    StandardizedUSLocation,
)
from scripts.models import Article

ROOT = Path(__file__).resolve().parents[2]


def valid_intelligence(**overrides):
    geography = [
        {
            **entry,
            "raw_extracted": {
                "country_code": None,
                "state": None,
                "city": None,
                "county": None,
                "region": None,
                **entry["raw_extracted"],
            },
        }
        for entry in overrides.pop("geography", [])
    ]
    return {
        "title": "Investigation reported",
        "summary": "Authorities reported an investigation.",
        "description": "Authorities reported an investigation into alleged abuse.",
        "exploitation_type": [],
        "platform": [],
        "technology": [],
        "affected_population": [],
        "offender_tactic": [],
        "geography": geography,
        "intel_type": [],
        "zap_program_relevance": [],
        **overrides,
    }


class ModelTests(unittest.TestCase):
    def test_county_mentions_do_not_support_a_same_named_city(self):
        raw = {
            "country_code": "US",
            "state": "California",
            "city": "Alameda",
            "county": "Alameda County",
            "region": None,
        }
        for article in (
            "Officials in Alameda County, California, announced funding.",
            "Officials in the County of Alameda announced funding.",
            "ALAMEDA\nCOUNTY announced funding for Alameda County residents.",
            "Alameda County officials described residents as Alamedans.",
        ):
            with self.subTest(article=article):
                with self.assertRaisesRegex(ValidationError, "only as a county"):
                    ExtractedLocation.model_validate(
                        raw, context={"article_text": article}
                    )
        # The guard also works if the provider omitted the county value itself.
        with self.assertRaisesRegex(ValidationError, "only as a county"):
            ExtractedLocation.model_validate(
                {**raw, "county": None},
                context={
                    "article_text": "Officials in Alameda County announced funding."
                },
            )

    def test_separately_named_city_is_preserved_alongside_county(self):
        raw = {
            "country_code": "US",
            "state": "California",
            "city": "Alameda",
            "county": "Alameda County",
            "region": None,
        }
        for article in (
            "Alameda County and the city of Alameda announced funding.",
            "Alameda officials joined Alameda County officials.",
            "Officials in Alameda, California, announced funding.",
        ):
            with self.subTest(article=article):
                result = ExtractedLocation.model_validate(
                    raw, context={"article_text": article}
                )
                self.assertEqual(result.city, "Alameda")
        # Standalone resolver inputs have no article to check against.
        self.assertEqual(ExtractedLocation(**raw).city, "Alameda")

    def test_location_fields_are_required_but_can_be_null(self):
        fields = {"country_code", "state", "city", "county", "region"}
        self.assertEqual(set(ExtractedLocation.model_json_schema()["required"]), fields)
        empty = dict.fromkeys(fields)
        self.assertEqual(ExtractedLocation(**empty).model_dump(), empty)
        for field in fields:
            with self.subTest(field=field):
                incomplete = empty.copy()
                del incomplete[field]
                with self.assertRaises(ValidationError):
                    ExtractedLocation(**incomplete)

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

        with self.assertRaises(ValidationError):
            IntelligenceItem(
                **valid_intelligence(zap_program_relevance=["invented program"])
            )

    def test_duplicates_removed_without_losing_order_or_distinct_geography(self):
        california = {"raw_extracted": {"state": "CA", "city": "Oakland"}}
        nevada = {"raw_extracted": {"state": "NV", "city": "Las Vegas"}}

        item = IntelligenceItem(
            **valid_intelligence(
                platform=["Telegram", "Discord", "Telegram"],
                zap_program_relevance=[
                    "Prevention & Education",
                    "Investigation & Justice",
                    "Prevention & Education",
                ],
                geography=[california, california, nevada],
            )
        )
        self.assertEqual(item.platform, ["Telegram", "Discord"])
        self.assertEqual(
            item.zap_program_relevance,
            ["Prevention & Education", "Investigation & Justice"],
        )

        self.assertEqual([g.raw_extracted.state for g in item.geography], ["CA", "NV"])

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

    def extract_relevance(self, article_text, relevance):
        article = Article(url=HttpUrl("https://example.com"), article_text=article_text)
        result = extract_intelligence(
            article,
            client=self.make_client(
                [json.dumps(valid_intelligence(zap_program_relevance=relevance))]
            ),
            model="requested-test-model",
        )
        self.assertEqual(result.intelligence.zap_program_relevance, relevance)

    def test_success_preserves_source_without_extraction_metadata(self):
        result = self.extract(self.make_client([json.dumps(valid_intelligence())]))
        self.assertEqual(result.article, self.article)
        self.assertEqual(set(result.model_dump()), {"article", "intelligence"})
        request = self.requests[0]
        self.assertEqual(request["response_format"]["type"], "json_schema")
        self.assertTrue(request["provider"]["require_parameters"])

    def test_geography_is_resolved_after_mocked_provider_extraction(self):
        data = valid_intelligence(
            geography=[
                {"raw_extracted": {"city": "Oakland", "state": "CA"}},
                {"raw_extracted": {"county": "Alameda County", "state": "CA"}},
            ]
        )
        result = self.extract(self.make_client([json.dumps(data)]))
        city, county = result.intelligence.geography
        assert city.standardized is not None
        assert county.standardized is not None
        self.assertEqual(city.standardized.county_fips, "06001")
        self.assertEqual(
            city.standardized.regions, [USRegion.WEST, USRegion.WEST_COAST]
        )
        self.assertEqual(county.standardized.county_fips, "06001")
        self.assertIsNone(city.raw_extracted.county)
        self.assertEqual(county.raw_extracted.county, "Alameda County")
        self.assertNotIn(
            "standardized", json.dumps(self.requests[0]["response_format"])
        )

    def test_omitted_location_context_is_retried(self):
        # Actual provider failure: only city/county/region were returned.
        complete = valid_intelligence(
            geography=[
                {
                    "raw_extracted": {
                        "city": "Oakland",
                        "state": "CA",
                        "country_code": "US",
                    }
                }
            ]
        )
        incomplete = json.loads(json.dumps(complete))
        del incomplete["geography"][0]["raw_extracted"]["state"]
        del incomplete["geography"][0]["raw_extracted"]["country_code"]
        result = self.extract(
            self.make_client([json.dumps(incomplete), json.dumps(complete)])
        )
        self.assertEqual(len(self.requests), 2)
        location = result.intelligence.geography[0].standardized
        assert location is not None
        self.assertEqual(location.status, "resolved")
        self.assertEqual(location.county_fips, "06001")

    def test_country_qualified_region_is_resolved_without_changing_raw_output(self):
        raw = {
            "country_code": "US",
            "state": None,
            "city": None,
            "county": None,
            "region": "West Coast of the United States",
        }
        data = valid_intelligence(geography=[{"raw_extracted": raw}])
        result = self.extract(self.make_client([json.dumps(data)]))
        geography = result.intelligence.geography[0]
        self.assertEqual(geography.raw_extracted.model_dump(), raw)
        assert geography.standardized is not None
        self.assertEqual(geography.standardized.status, "resolved")
        self.assertEqual(
            geography.standardized.regions, [USRegion.WEST, USRegion.WEST_COAST]
        )
        self.assertIsNone(geography.standardized.state_code)
        self.assertIsNone(geography.standardized.city)
        self.assertIsNone(geography.standardized.county)
        self.assertEqual(len(self.requests), 1)

    def test_city_invented_from_county_is_retried_before_resolution(self):
        self.article = Article(
            url=self.article.url,
            article_text="Officials in Alameda County, California, announced funding.",
        )
        incorrect = valid_intelligence(
            geography=[
                {
                    "raw_extracted": {
                        "country_code": "US",
                        "state": "California",
                        "city": "Alameda",
                        "county": "Alameda County",
                        "region": None,
                    }
                }
            ]
        )
        corrected = json.loads(json.dumps(incorrect))
        corrected["geography"][0]["raw_extracted"]["city"] = None
        result = self.extract(
            self.make_client([json.dumps(incorrect), json.dumps(corrected)])
        )
        self.assertEqual(len(self.requests), 2)
        self.assertIn("only as a county", json.dumps(self.requests[1]["messages"]))
        geography = result.intelligence.geography[0]
        self.assertIsNone(geography.raw_extracted.city)
        assert geography.standardized is not None
        self.assertIsNone(geography.standardized.city)
        self.assertEqual(geography.standardized.county_fips, "06001")
        self.assertEqual(geography.standardized.status, "resolved")

    def test_persistent_city_invention_is_not_returned_as_resolved(self):
        self.article = Article(
            url=self.article.url,
            article_text="Officials in Alameda County, California, announced funding.",
        )
        data = valid_intelligence(
            geography=[
                {
                    "raw_extracted": {
                        "country_code": "US",
                        "state": "CA",
                        "city": "Alameda",
                        "county": "Alameda County",
                    }
                }
            ]
        )
        with self.assertRaises(ExtractionError):
            self.extract(self.make_client([json.dumps(data)]))
        self.assertEqual(len(self.requests), 4)

    def test_persistently_omitted_location_context_fails_validation(self):
        data = valid_intelligence(geography=[{"raw_extracted": {"city": "Oakland"}}])
        del data["geography"][0]["raw_extracted"]["state"]
        with self.assertRaisesRegex(ExtractionError, "raw_extracted.state"):
            self.extract(self.make_client([json.dumps(data)]))
        self.assertEqual(len(self.requests), 4)

    def test_partial_geography_keeps_the_original_county_in_serialized_output(self):
        raw = {"city": "Oakland", "county": "Almeda", "state": "CA"}
        data = valid_intelligence(geography=[{"raw_extracted": raw}])
        result = self.extract(self.make_client([json.dumps(data)]))
        geography = result.model_dump(mode="json")["intelligence"]["geography"][0]
        self.assertEqual(geography["raw_extracted"]["county"], "Almeda")
        standardized = geography["standardized"]
        self.assertEqual(standardized["status"], "partial")
        self.assertEqual(standardized["city"], "Oakland")
        self.assertEqual(standardized["regions"], ["West", "West Coast"])
        self.assertIsNone(standardized["county"])
        self.assertIsNone(standardized["county_fips"])

    def test_foreign_and_uncertain_locations_survive_extraction(self):
        locations = [
            {"country_code": "CA", "state": "Ontario", "city": "London"},
            {"country_code": "FR", "region": "Brittany"},
            {"city": "London"},
            {"state": "CA", "city": "Oakland"},
        ]
        data = valid_intelligence(
            geography=[{"raw_extracted": location} for location in locations]
        )
        result = self.extract(self.make_client([json.dumps(data)]))
        geography = result.model_dump(mode="json")["intelligence"]["geography"]
        self.assertEqual(len(geography), 4)
        for supplied, actual in zip(locations, geography):
            for field, value in supplied.items():
                self.assertEqual(actual["raw_extracted"][field], value)
        for entry in geography[:3]:
            self.assertEqual(entry["standardized"]["status"], "unmatched")
            self.assertIsNone(entry["standardized"]["country_code"])
            self.assertIsNone(entry["standardized"]["state_code"])
        self.assertIsNone(geography[2]["raw_extracted"]["country_code"])
        self.assertEqual(geography[3]["standardized"]["country_code"], "US")
        self.assertEqual(geography[3]["standardized"]["status"], "resolved")

    def test_provider_cannot_supply_standardized_values(self):
        data = valid_intelligence(
            geography=[
                {
                    "raw_extracted": {"city": "Oakland", "state": "CA"},
                    "standardized": {"state_code": "NY", "status": "resolved"},
                }
            ]
        )
        with self.assertRaises(ExtractionError):
            self.extract(self.make_client([json.dumps(data)]))

    def test_missing_reference_data_fails_before_provider_call(self):
        client = Mock()
        with (
            patch(
                "scripts.intelligence.extractor.get_default_resolver",
                side_effect=FileNotFoundError("Missing reference CSV"),
            ),
            self.assertRaisesRegex(ConfigurationError, "geography reference"),
        ):
            self.extract(client)
        client.chat.completions.create.assert_not_called()

    def test_resolver_is_injectable(self):
        resolver = Mock()
        resolver.standardize.return_value = StandardizedUSLocation(
            state_code="CA",
            regions=[USRegion.WEST, USRegion.WEST_COAST],
            status="resolved",
        )
        data = valid_intelligence(geography=[{"raw_extracted": {"state": "CA"}}])
        with patch("scripts.intelligence.extractor.get_default_resolver") as default:
            result = extract_intelligence(
                self.article,
                self.make_client([json.dumps(data)]),
                resolver=resolver,
            )
        default.assert_not_called()
        resolver.standardize.assert_called_once()
        assert result.intelligence.geography[0].standardized is not None
        self.assertEqual(result.intelligence.geography[0].standardized.state_code, "CA")

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
            url=HttpUrl("https://example.com/article"), article_text="Example article."
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
