"""Offline checks for bounded previews, conservative routing, and provider fallback."""

import json
import unittest
from unittest.mock import Mock, patch

from pydantic import ValidationError

from scripts.ingestion import ingest_url
from scripts.intelligence.extractor import ExtractionError
from scripts.intelligence.models import ScreeningDecision
from scripts.intelligence.screening import PREVIEW_LIMITS, screen_article
from scripts.models import Article
from scripts.scraper.models import ScrapeResult
from tests.intelligence import test_intelligence_unit as fixtures
from tests.intelligence.test_intelligence_unit import valid_assessment


class ScreeningTests(unittest.TestCase):
    # Reuse the HTTP fixture; all responses pass through real Instructor validation.
    make_client = fixtures.ExtractionTests.make_client
    json_only_error = fixtures.ExtractionTests.json_only_error

    def setUp(self):
        self.requests = []
        self.article = Article(
            url="https://example.com/resource", title="Safety guidance",
            meta_description="Guidance about protecting children.",
            article_text="Opening context. " * 200 + "FULL_TEXT_END",
        )

    def test_only_bounded_preview_is_sent_and_output_is_small(self):
        page = self.article.model_copy(update={"title": "T" * 1000, "meta_description": "D" * 2000})
        decision = screen_article(page, self.make_client([
            json.dumps({"decision": "uncertain", "reason": "Needs full text."}),
        ]))
        self.assertEqual(decision.decision, "uncertain")
        self.assertEqual(len(self.requests), 1)
        request = self.requests[0]
        preview = json.loads(request["messages"][1]["content"])
        self.assertEqual({key: len(value) for key, value in preview.items()}, PREVIEW_LIMITS)
        self.assertNotIn("FULL_TEXT_END", request["messages"][1]["content"])
        self.assertLessEqual(request["max_tokens"], 128)
        schema = request["response_format"]["json_schema"]["schema"]
        self.assertEqual(set(schema["properties"]), {"decision", "reason"})

    def test_missing_metadata_is_allowed(self):
        screen_article(Article(url="https://example.com", article_text="Short context."), self.make_client([
            json.dumps({"decision": "uncertain", "reason": "Missing context."}),
        ]))
        preview = json.loads(self.requests[0]["messages"][1]["content"])
        self.assertEqual(preview, {"title": "", "meta_description": "", "excerpt": "Short context."})

    def test_malformed_screen_is_not_repeated(self):
        with self.assertRaises(ExtractionError):
            screen_article(self.article, self.make_client(["{"]))
        self.assertEqual(len(self.requests), 1)

    def test_json_only_provider_fallback_preserves_small_request(self):
        result = screen_article(self.article, self.make_client([
            json.dumps({"decision": "irrelevant", "reason": "Sports scores."}),
        ], initial_error=self.json_only_error()))
        self.assertEqual(result.decision, "irrelevant")
        self.assertEqual([r["response_format"]["type"] for r in self.requests], ["json_schema", "json_object"])
        self.assertTrue(all(r["max_tokens"] == 128 for r in self.requests))

    def test_invalid_decisions_and_reasons_are_rejected(self):
        for data in [
            {"decision": "reject", "reason": "Unrelated."},
            {"decision": "irrelevant", "reason": "  "},
            {"decision": "irrelevant", "reason": "R" * 241},
            {"reason": "Missing decision."},
        ]:
            with self.subTest(data=data), self.assertRaises(ValidationError):
                ScreeningDecision(**data)

    def ingest(self, responses, **options):
        repository = Mock()
        repository.get_processed_page.return_value = None
        repository.article_exists.return_value = False
        repository.save_intelligence.return_value = "item-id"
        with patch("scripts.ingestion.pipeline.scrape_url", return_value=ScrapeResult(
            str(self.article.url), "html", self.article,
        )):
            summary = ingest_url(
                str(self.article.url), "source-id", repository=repository,
                client=self.make_client(responses), **options,
            )
        return summary, repository

    def test_clear_rejection_uses_only_screen_and_is_cached(self):
        summary, repository = self.ingest([
            json.dumps({"decision": "irrelevant", "reason": "Unrelated sports results."}),
        ])
        self.assertEqual((summary.irrelevant, summary.saved), (1, 0))
        self.assertEqual(summary.pages[0].stage, "screening")
        self.assertEqual(len(self.requests), 1)
        repository.save_intelligence.assert_not_called()
        self.assertEqual(repository.record_processing.call_args.args[1].relevance, "irrelevant")

    def test_potential_and_uncertainty_continue_to_full_text(self):
        for decision in ["potentially_relevant", "uncertain"]:
            with self.subTest(decision=decision):
                self.requests.clear()
                summary, repository = self.ingest([
                    json.dumps({"decision": decision, "reason": "May concern child safety."}),
                    json.dumps(valid_assessment()),
                ], model="full-model", screening_model="small-model")
                self.assertEqual(summary.saved, 1)
                self.assertEqual([r["model"] for r in self.requests], ["small-model", "full-model"])
                self.assertIn("FULL_TEXT_END", self.requests[1]["messages"][1]["content"])
                self.assertNotIn("FULL_TEXT_END", self.requests[0]["messages"][1]["content"])
                repository.save_intelligence.assert_called_once()

    def test_invalid_screen_falls_through_to_full_assessment(self):
        summary, repository = self.ingest(["{", json.dumps(valid_assessment())])
        self.assertEqual((summary.saved, summary.failed), (1, 0))
        self.assertEqual(len(self.requests), 2)
        repository.save_intelligence.assert_called_once()

    def test_screen_acceptance_does_not_bypass_full_relevance_gate(self):
        summary, repository = self.ingest([
            json.dumps({"decision": "potentially_relevant", "reason": "Possibly related."}),
            json.dumps(valid_assessment(relevance="irrelevant", relevance_reason="Unrelated full text.", intelligence=None)),
        ])
        self.assertEqual((summary.saved, summary.irrelevant), (0, 1))
        self.assertEqual(summary.pages[0].stage, "relevance")
        repository.save_intelligence.assert_not_called()


if __name__ == "__main__":
    unittest.main()
