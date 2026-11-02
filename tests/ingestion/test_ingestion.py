"""Offline ingestion tests: no live database, provider, or website requests."""

import json
import unittest
from contextlib import contextmanager
from datetime import timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

from psycopg.pq import TransactionStatus

from scripts.ingestion import PostgresRepository, Source, ingest_source, ingest_url
from scripts.ingestion.cache import article_hash, assessment_key
from scripts.ingestion.models import ProcessedPage
from scripts.intelligence.extractor import ExtractionError
from scripts.intelligence.models import ExtractionResult, IntelligenceItem, ScreeningDecision
from scripts.models import Article
from scripts.scraper.models import CrawlFailure, CrawlResult, ScrapeResult
from tests.scraper.test_scraper import FixtureSession, ROOT, article as html_article, public_dns


def article(name):
    return Article(url=f"https://example.com/news/{name}", article_text=f"Article {name}")


def extraction(page):
    return ExtractionResult(article=page, relevance="relevant", relevance_reason="Child protection report.", intelligence=IntelligenceItem(
        title="Reported development", summary="Summary", description="Description",
        exploitation_type=[], platform=["Discord", "Telegram"], technology=[],
        affected_population=[], offender_tactic=[], geography=[], intel_type=[],
        zap_program_relevance=[],
    ))


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.screen = self.enterContext(patch(
            "scripts.ingestion.pipeline.screen_article",
            return_value=ScreeningDecision(decision="uncertain", reason="Needs full text."),
        ))
        self.repository = Mock()
        self.repository.get_source.return_value = Source("source-id", "https://example.com/news")
        self.repository.article_exists.return_value = False
        self.repository.get_processed_page.return_value = None
        self.repository.save_intelligence.return_value = "item-id"
        self.client = Mock()
        self.options = {"repository": self.repository, "client": self.client}

    @patch("scripts.ingestion.pipeline.extract_intelligence", side_effect=lambda page, **kw: extraction(page))
    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_single_url_saves_without_updating_source_timestamp(self, scrape, extract):
        page = article("a")
        scrape.return_value = ScrapeResult(str(page.url), "html", page)
        summary = ingest_url(str(page.url), "source-id", **self.options)
        self.assertEqual((summary.saved, summary.skipped, summary.failed), (1, 0, 0))
        extract.assert_called_once_with(page, client=self.client, model="openrouter/free")
        self.repository.save_intelligence.assert_called_once()
        self.repository.update_last_crawled_at.assert_not_called()
        self.client.client.close.assert_not_called()
        self.repository.close.assert_not_called()
        self.assertEqual(summary.pages[0].item_id, "item-id")

    @patch("scripts.ingestion.pipeline.extract_intelligence")
    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_single_irrelevant_article_never_reaches_storage(self, scrape, extract):
        page = article("sports")
        scrape.return_value = ScrapeResult(str(page.url), "html", page)
        extract.return_value = ExtractionResult(
            article=page, relevance="irrelevant", relevance_reason="Sports results.", intelligence=None,
        )
        summary = ingest_url(str(page.url), "source-id", **self.options)
        self.assertEqual((summary.saved, summary.irrelevant, summary.failed), (0, 1, 0))
        self.assertEqual(summary.pages[0].message, "Sports results.")
        self.assertEqual(summary.to_dict()["irrelevant"], 1)
        self.repository.save_intelligence.assert_not_called()

    @patch("scripts.ingestion.pipeline.crawl_site")
    @patch("scripts.ingestion.pipeline.extract_intelligence")
    def test_batch_rejects_irrelevant_and_continues_to_relevant(self, extract, crawl):
        unrelated, relevant = article("unrelated"), article("relevant")
        crawl.return_value = CrawlResult("https://example.com", pages=[unrelated, relevant])
        extract.side_effect = [ExtractionResult(
            article=unrelated, relevance="irrelevant", relevance_reason="Unrelated crime.", intelligence=None,
        ), extraction(relevant)]
        summary = ingest_source("source-id", **self.options)
        self.assertEqual((summary.saved, summary.irrelevant, summary.failed), (1, 1, 0))
        self.repository.save_intelligence.assert_called_once_with("source-id", extraction(relevant))

    @patch("scripts.ingestion.pipeline.extract_intelligence", side_effect=ExtractionError("Missing relevance decision"))
    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_invalid_assessment_fails_without_saving(self, scrape, extract):
        page = article("invalid-assessment")
        scrape.return_value = ScrapeResult(str(page.url), "html", page)
        summary = ingest_url(str(page.url), "source-id", **self.options)
        self.assertEqual((summary.saved, summary.irrelevant, summary.failed), (0, 0, 1))
        self.repository.save_intelligence.assert_not_called()

    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_existing_unchanged_url_skips_model_after_fetching(self, scrape):
        page = article("a")
        self.repository.article_exists.return_value = True
        self.repository.get_processed_page.return_value = ProcessedPage(
            article_hash(page), assessment_key("openrouter/free"),
            "relevant", "Child protection report.",
        )
        scrape.return_value = ScrapeResult(str(page.url), "html", page)
        with patch("scripts.ingestion.pipeline.extract_intelligence") as extract:
            summary = ingest_url(str(page.url), "source-id", **self.options)
        extract.assert_not_called()
        self.assertEqual(summary.skipped, 1)
        self.assertEqual(summary.pages[0].stage, "cache_check")
        scrape.assert_called_once()

    @patch("scripts.ingestion.pipeline.extract_intelligence")
    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_redirect_to_saved_article_skips_provider(self, scrape, extract):
        page = article("final")
        self.repository.article_exists.return_value = True
        self.repository.get_processed_page.return_value = ProcessedPage(
            article_hash(page), assessment_key("openrouter/free"),
            "relevant", "Child protection report.",
        )
        scrape.return_value = ScrapeResult(str(page.url), "html", page)
        summary = ingest_url(str(article("old").url), "source-id", **self.options)
        self.assertEqual(summary.skipped, 1)
        extract.assert_not_called()

    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_single_scrape_failure_and_no_content_are_reported(self, scrape):
        for response in [RuntimeError("bad page"), ScrapeResult(str(article("a").url), "", None, "No text")]:
            with self.subTest(response=response):
                scrape.side_effect = [response]
                summary = ingest_url(str(article("a").url), "source-id", **self.options)
                self.assertEqual(summary.failed, 1)
                self.repository.save_intelligence.assert_not_called()

    @patch("scripts.ingestion.pipeline.crawl_site")
    @patch("scripts.ingestion.pipeline.extract_intelligence")
    def test_mixed_batch_continues_after_extraction_and_save_failures(self, extract, crawl):
        pages = [article(name) for name in ["existing", "bad-extract", "bad-save", "good"]]
        crawl.return_value = CrawlResult(
            "https://example.com/news", pages=pages,
            failures=[CrawlFailure("https://example.com/news/down", "fetch", "HTTP 500")],
            visited_urls=[str(page.url) for page in pages],
        )
        self.repository.article_exists.side_effect = lambda url: url.endswith("/existing")
        self.repository.get_processed_page.side_effect = lambda url: (
            ProcessedPage(article_hash(pages[0]), assessment_key("openrouter/free"),
                          "relevant", "Child protection report.")
            if url.endswith("/existing") else None
        )
        extract.side_effect = [ExtractionError("provider failed"), extraction(pages[2]), extraction(pages[3])]
        self.repository.save_intelligence.side_effect = [RuntimeError("insert failed"), "good-id"]
        summary = ingest_source("source-id", max_pages=5, max_depth=2, request_delay=0, **self.options)
        self.assertEqual((summary.saved, summary.skipped, summary.failed), (1, 1, 3))
        self.assertEqual(summary.pages[-1].item_id, "good-id")
        self.assertTrue(summary.last_crawled_at_updated)
        args, kwargs = crawl.call_args
        self.assertEqual(args, ("https://example.com/news",))
        self.assertEqual((kwargs["max_pages"], kwargs["max_depth"], kwargs["include_seed"]), (5, 2, False))
        timestamp = self.repository.update_last_crawled_at.call_args.args[1]
        self.assertEqual(timestamp.tzinfo, timezone.utc)
        self.assertEqual(summary.to_dict()["failed"], 3)
        json.dumps(summary.to_dict())

    @patch("scripts.ingestion.pipeline.crawl_site")
    @patch("scripts.ingestion.pipeline.extract_intelligence", side_effect=lambda page, **kw: extraction(page))
    def test_save_race_is_skipped_and_timestamp_failure_preserves_counts(self, extract, crawl):
        crawl.return_value = CrawlResult("https://example.com/news", pages=[article("a")])
        self.repository.save_intelligence.return_value = None
        self.repository.update_last_crawled_at.side_effect = RuntimeError("database unavailable")
        summary = ingest_source("source-id", **self.options)
        self.assertEqual((summary.saved, summary.skipped, summary.failed), (0, 1, 0))
        self.assertFalse(summary.last_crawled_at_updated)
        self.assertEqual(len(summary.run_errors), 1)

    @patch("scripts.ingestion.pipeline.crawl_site")
    def test_empty_and_all_failed_crawls_still_update_timestamp(self, crawl):
        for failures in [[], [CrawlFailure("https://example.com/news", "fetch", "Failed")]]:
            crawl.return_value = CrawlResult("https://example.com/news", failures=failures)
            summary = ingest_source("source-id", **self.options)
            self.assertTrue(summary.last_crawled_at_updated)
            self.assertEqual(summary.failed, len(failures))

    @patch("scripts.ingestion.pipeline.crawl_site", side_effect=ValueError("Invalid limits"))
    def test_invalid_crawl_does_not_update_timestamp(self, crawl):
        with self.assertRaises(ValueError):
            ingest_source("source-id", max_pages=0, **self.options)
        self.repository.update_last_crawled_at.assert_not_called()

    @patch("scripts.ingestion.pipeline.crawl_site")
    def test_invalid_sources_do_not_start_crawl(self, crawl):
        for source in [Source("source-id", None), Source("source-id", "https://example.com", False)]:
            self.repository.get_source.return_value = source
            with self.assertRaises(ValueError):
                ingest_source("source-id", **self.options)
        crawl.assert_not_called()
        self.repository.update_last_crawled_at.assert_not_called()

    @patch("scripts.ingestion.pipeline.create_client")
    @patch("scripts.ingestion.pipeline.PostgresRepository.from_environment")
    @patch("scripts.ingestion.pipeline.scrape_url", side_effect=RuntimeError("page failed"))
    def test_default_resources_are_closed_even_after_failure(self, scrape, repository, client):
        repository.return_value = self.repository
        client.return_value = self.client
        ingest_url(str(article("a").url), "source-id")
        self.repository.close.assert_called_once()
        self.client.client.close.assert_called_once()

    @patch("scripts.ingestion.pipeline.create_client", side_effect=ValueError("Missing key"))
    @patch("scripts.ingestion.pipeline.PostgresRepository.from_environment")
    def test_owned_database_closes_if_client_setup_fails(self, repository, client):
        repository.return_value = self.repository
        with self.assertRaises(ValueError):
            ingest_source("source-id")
        self.repository.close.assert_called_once()
        self.repository.update_last_crawled_at.assert_not_called()

    @patch("scripts.scraper.fetcher.socket.getaddrinfo", side_effect=public_dns)
    @patch("scripts.ingestion.pipeline.extract_intelligence", side_effect=lambda page, **kw: extraction(page))
    def test_real_bounded_crawler_feeds_articles_to_extraction_and_saving(self, extract, dns):
        from scripts.scraper import crawl_site as real_crawl

        self.repository.get_source.return_value = Source("source-id", ROOT + "/news")
        session = FixtureSession({
            ROOT + "/news": html_article(links=["/news/a", "/news/b"]),
            ROOT + "/news/a": html_article(links=["/news/deeper"]),
        })

        def crawl(url, **options):
            return real_crawl(url, session=session, **options)

        with patch("scripts.ingestion.pipeline.crawl_site", side_effect=crawl):
            summary = ingest_source(
                "source-id", max_pages=2, max_depth=1, request_delay=0, **self.options,
            )
        self.assertEqual(summary.saved, 1)
        self.assertEqual(summary.visited_urls, [ROOT + "/news", ROOT + "/news/a"])
        self.assertEqual(str(extract.call_args.args[0].url), ROOT + "/news/a")
        self.assertTrue(summary.last_crawled_at_updated)


class TransactionConnection:
    """Exercise transaction boundaries with a deliberately failing second insert."""

    def __init__(self):
        self.autocommit = True
        self.info = SimpleNamespace(transaction_status=TransactionStatus.IDLE)
        self.rows = {}
        self.events = []
        self.calls = []
        self.fail_next_insert = False
        self.processed = {}

    @contextmanager
    def transaction(self):
        before = dict(self.rows)
        before_processed = dict(self.processed)
        self.events.append("begin")
        try:
            yield
        except Exception:
            self.rows = before
            self.processed = before_processed
            self.events.append("rollback")
            raise
        else:
            self.events.append("commit")

    def execute(self, sql, params):
        self.calls.append((sql, params))
        if sql.startswith("SELECT source_id"):
            return Mock(fetchone=lambda: ("source-id", "https://example.com/news", True))
        if sql.startswith("SELECT content_hash"):
            record = self.processed.get(params[0])
            return Mock(fetchone=lambda: record)
        if sql.startswith("INSERT INTO processed_pages"):
            self.processed[params[0]] = params[1:]
            return Mock()
        if sql.startswith("SELECT 1"):
            return Mock(fetchone=lambda: (1,) if params[0] in self.rows else None)
        if sql.startswith("INSERT"):
            self.rows[params[1]] = params
            if self.fail_next_insert:
                self.fail_next_insert = False
                raise RuntimeError("Simulated insert failure")
            return Mock(fetchone=lambda: ("item-id",))
        return Mock()


class ProcessingCacheTests(unittest.TestCase):
    """Exercise repeated ingestion calls through the actual repository adapter."""

    def setUp(self):
        self.screen = self.enterContext(patch(
            "scripts.ingestion.pipeline.screen_article",
            return_value=ScreeningDecision(decision="uncertain", reason="Needs full text."),
        ))
        self.connection = TransactionConnection()
        self.repository = PostgresRepository(self.connection)
        self.page = article("cached")
        self.options = {"repository": self.repository, "client": Mock()}
        self.relevance = "irrelevant"
        self.scrape = self.enterContext(patch(
            "scripts.ingestion.pipeline.scrape_url",
            side_effect=lambda url: ScrapeResult(str(self.page.url), "html", self.page),
        ))
        self.extract = self.enterContext(patch(
            "scripts.ingestion.pipeline.extract_intelligence", side_effect=self.assess,
        ))

    def assess(self, page, **options):
        if self.relevance == "relevant":
            return extraction(page)
        return ExtractionResult(
            article=page, relevance="irrelevant", relevance_reason="Unrelated content.", intelligence=None,
        )

    def ingest(self, **options):
        return ingest_url(str(self.page.url), "source-id", **self.options, **options)

    def change_text(self):
        self.page = self.page.model_copy(update={"article_text": "Updated child protection report."})

    def test_screen_rejection_is_cached_without_full_assessment(self):
        self.screen.return_value = ScreeningDecision(decision="irrelevant", reason="Sports results.")
        first = self.ingest()
        second = self.ingest()
        self.assertEqual(first.pages[0].stage, "screening")
        self.assertEqual(second.pages[0].stage, "cache_check")
        self.assertEqual((first.irrelevant, second.irrelevant), (1, 1))
        self.screen.assert_called_once()
        self.extract.assert_not_called()
        self.assertEqual(self.connection.rows, {})

    def test_metadata_change_invalidates_screen_rejection(self):
        self.screen.return_value = ScreeningDecision(decision="irrelevant", reason="Sports results.")
        self.ingest()
        self.page = self.page.model_copy(update={"meta_description": "Supporting survivors of childhood abuse."})
        self.screen.return_value = ScreeningDecision(decision="uncertain", reason="Needs full text.")
        self.relevance = "relevant"
        self.assertEqual(self.ingest().saved, 1)
        self.assertEqual(self.ingest().skipped, 1)
        self.assertEqual(self.screen.call_count, 2)
        self.extract.assert_called_once()

    def test_screen_failure_continues_to_full_assessment(self):
        self.screen.side_effect = ExtractionError("Screening unavailable")
        self.relevance = "relevant"
        self.assertEqual(self.ingest().saved, 1)
        self.extract.assert_called_once()

    def test_both_requests_failing_does_not_create_cache_entry(self):
        self.screen.side_effect = ExtractionError("Screening unavailable")
        self.extract.side_effect = ExtractionError("Full assessment unavailable")
        self.assertEqual(self.ingest().failed, 1)
        self.assertEqual(self.connection.processed, {})

    def test_screen_model_and_prompt_changes_invalidate_cache(self):
        self.screen.return_value = ScreeningDecision(decision="irrelevant", reason="Sports results.")
        self.ingest()
        self.ingest(screening_model="another-screening-model")
        with patch("scripts.ingestion.cache.SCREENING_PROMPT", "Revised conservative screen"):
            self.ingest(screening_model="another-screening-model")
        self.assertEqual(self.screen.call_count, 3)
        self.extract.assert_not_called()

    def test_blank_screening_model_is_rejected_before_fetching(self):
        with self.assertRaises(ValueError):
            self.ingest(screening_model="  ")
        self.scrape.assert_not_called()
        self.screen.assert_not_called()

    def test_unchanged_irrelevant_page_is_assessed_once_across_restarts(self):
        first = self.ingest()
        # Reopening a repository still finds the persisted decision.
        self.options["repository"] = PostgresRepository(self.connection)
        second = self.ingest()
        self.assertEqual((first.irrelevant, second.irrelevant), (1, 1))
        self.assertEqual(second.pages[0].stage, "cache_check")
        self.assertEqual(second.pages[0].message, "Unrelated content.")
        self.assertEqual(self.extract.call_count, 1)
        self.assertEqual(self.screen.call_count, 1)
        self.assertEqual(self.scrape.call_count, 2)
        self.assertEqual(self.connection.rows, {})

    def test_changed_rejected_content_can_become_relevant(self):
        self.ingest()
        self.change_text()
        self.relevance = "relevant"
        changed = self.ingest()
        unchanged = self.ingest()
        self.assertEqual((changed.saved, unchanged.skipped), (1, 1))
        self.assertEqual(self.extract.call_count, 2)
        record = self.repository.get_processed_page(str(self.page.url))
        self.assertEqual(record.relevance, "relevant")
        self.assertEqual(record.content_hash, article_hash(self.page))
        self.assertEqual(len(self.connection.processed), 1)

    def test_saved_page_is_reassessed_if_its_text_changes(self):
        self.relevance = "relevant"
        self.assertEqual(self.ingest().saved, 1)
        self.assertEqual(self.ingest().skipped, 1)
        self.change_text()
        self.relevance = "irrelevant"
        self.assertEqual(self.ingest().irrelevant, 1)
        self.assertEqual(self.ingest().pages[0].stage, "cache_check")
        self.assertEqual(self.extract.call_count, 2)
        # This change does not delete or rewrite existing library entries.
        self.assertEqual(len(self.connection.rows), 1)

    def test_changed_model_prompt_and_schema_invalidate_decisions(self):
        self.ingest()
        self.ingest(model="another-model")
        with patch("scripts.ingestion.cache.SYSTEM_PROMPT", "Revised relevance rubric"):
            self.ingest(model="another-model")
        with patch("scripts.ingestion.cache.IntelligenceAssessment.model_json_schema", return_value={"revision": 2}):
            self.ingest(model="another-model")
        self.assertEqual(self.extract.call_count, 4)

    def test_model_failure_does_not_cache_and_can_be_retried(self):
        self.extract.side_effect = ExtractionError("Provider unavailable")
        self.assertEqual(self.ingest().failed, 1)
        self.assertEqual(self.connection.processed, {})
        self.extract.side_effect = self.assess
        self.assertEqual(self.ingest().irrelevant, 1)
        self.assertEqual(self.extract.call_count, 2)

    def test_failed_save_does_not_cache_relevant_decision(self):
        self.relevance = "relevant"
        self.connection.fail_next_insert = True
        self.assertEqual(self.ingest().failed, 1)
        self.assertEqual(self.connection.rows, {})
        self.assertEqual(self.connection.processed, {})
        self.assertEqual(self.ingest().saved, 1)
        self.assertEqual(self.extract.call_count, 2)

    def test_removed_saved_item_is_not_hidden_by_relevant_cache(self):
        self.relevance = "relevant"
        self.ingest()
        self.connection.rows.clear()
        self.assertEqual(self.ingest().saved, 1)
        self.assertEqual(self.extract.call_count, 2)

    def test_saved_item_remains_saved_if_cache_write_fails(self):
        self.relevance = "relevant"
        with patch.object(self.repository, "record_processing", side_effect=RuntimeError("Cache unavailable")):
            result = self.ingest()
        self.assertEqual((result.saved, result.failed), (1, 0))
        self.assertIn("cache write failed", result.pages[0].message)
        self.assertEqual(len(self.connection.rows), 1)
        self.assertEqual(self.connection.processed, {})

    def test_irrelevant_cache_write_failure_is_retryable(self):
        with patch.object(self.repository, "record_processing", side_effect=RuntimeError("Cache unavailable")):
            result = self.ingest()
        self.assertEqual(result.failed, 1)
        self.assertEqual(result.pages[0].stage, "cache_save")
        self.assertEqual(self.connection.processed, {})
        self.assertEqual(self.ingest().irrelevant, 1)
        self.assertEqual(self.extract.call_count, 2)

    def test_source_ingestion_uses_the_same_cache(self):
        crawl = CrawlResult("https://example.com/news", pages=[self.page])
        with patch("scripts.ingestion.pipeline.crawl_site", return_value=crawl):
            first = ingest_source("source-id", **self.options)
            second = ingest_source("source-id", **self.options)
        self.assertEqual((first.irrelevant, second.irrelevant), (1, 1))
        self.assertEqual(self.extract.call_count, 1)
        self.assertTrue(second.last_crawled_at_updated)

    def test_existing_library_row_without_cache_is_assessed_once(self):
        self.relevance = "relevant"
        self.repository.save_intelligence("source-id", extraction(self.page))
        self.assertEqual(self.ingest().skipped, 1)
        self.assertEqual(self.ingest().pages[0].stage, "cache_check")
        self.assertEqual(self.extract.call_count, 1)

    def test_final_normalized_url_is_used_as_cache_key(self):
        self.ingest()
        record = self.repository.get_processed_page(str(self.page.url) + "#section")
        self.assertEqual(record.relevance, "irrelevant")
        self.assertEqual(len(self.connection.processed), 1)



class RepositoryTests(unittest.TestCase):
    def test_rejects_connections_that_cannot_commit_each_save_independently(self):
        cases = [(False, TransactionStatus.IDLE)] + [
            (True, status) for status in TransactionStatus if status != TransactionStatus.IDLE
        ]
        for autocommit, status in cases:
            with self.subTest(autocommit=autocommit, status=status):
                connection = Mock(
                    autocommit=autocommit,
                    info=SimpleNamespace(transaction_status=status),
                )
                with self.assertRaisesRegex(ValueError, "idle connection with autocommit=True"):
                    PostgresRepository(connection)
                connection.execute.assert_not_called()
                connection.commit.assert_not_called()
                connection.rollback.assert_not_called()
                connection.close.assert_not_called()
                self.assertEqual(connection.autocommit, autocommit)

    def test_repository_refuses_irrelevant_results_before_transaction(self):
        connection = TransactionConnection()
        repository = PostgresRepository(connection)
        with self.assertRaises(ValueError):
            repository.save_intelligence("source-id", ExtractionResult(
                article=article("sports"), relevance="irrelevant",
                relevance_reason="Sports results.", intelligence=None,
            ))
        self.assertEqual(connection.calls, [])
        self.assertEqual(connection.events, [])

    def test_failed_save_rolls_back_only_its_transaction_and_next_save_works(self):
        connection = TransactionConnection()
        repository = PostgresRepository(connection)
        repository.save_intelligence("source-id", extraction(article("a")))
        connection.fail_next_insert = True
        with self.assertRaises(RuntimeError):
            repository.save_intelligence("source-id", extraction(article("b")))
        repository.save_intelligence("source-id", extraction(article("c")))
        self.assertEqual(set(connection.rows), {str(article("a").url), str(article("c").url)})
        self.assertEqual(connection.events, ["begin", "commit", "begin", "rollback", "begin", "commit"])

    def test_save_preserves_classifications_and_rechecks_duplicate_under_lock(self):
        connection = TransactionConnection()
        repository = PostgresRepository(connection)
        result = extraction(article("a"))
        self.assertEqual(repository.save_intelligence("source-id", result), "item-id")
        self.assertIsNone(repository.save_intelligence("source-id", result))
        inserts = [(sql, values) for sql, values in connection.calls if sql.startswith("INSERT")]
        self.assertEqual(len(inserts), 1)
        self.assertEqual(json.loads(inserts[0][1][6]), ["Discord", "Telegram"])
        self.assertIn("pg_advisory_xact_lock", connection.calls[0][0])


if __name__ == "__main__":
    unittest.main()
