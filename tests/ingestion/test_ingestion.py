"""Offline ingestion tests: no live database, provider, or website requests."""

import json
import unittest
from contextlib import contextmanager
from datetime import timezone
from unittest.mock import Mock, patch

from scripts.ingestion import PostgresRepository, Source, ingest_source, ingest_url
from scripts.intelligence.extractor import ExtractionError
from scripts.intelligence.models import ExtractionResult, IntelligenceItem
from scripts.models import Article
from scripts.scraper.models import CrawlFailure, CrawlResult, ScrapeResult
from tests.scraper.test_scraper import FixtureSession, ROOT, article as html_article, public_dns


def article(name):
    return Article(url=f"https://example.com/news/{name}", article_text=f"Article {name}")


def extraction(page):
    return ExtractionResult(article=page, intelligence=IntelligenceItem(
        title="Reported development", summary="Summary", description="Description",
        exploitation_type=[], platform=["Discord", "Telegram"], technology=[],
        affected_population=[], offender_tactic=[], geography=[], intel_type=[],
        zap_program_relevance=[],
    ))


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.repository = Mock()
        self.repository.get_source.return_value = Source("source-id", "https://example.com/news")
        self.repository.article_exists.return_value = False
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

    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_existing_url_skips_without_fetching(self, scrape):
        self.repository.article_exists.return_value = True
        summary = ingest_url(str(article("a").url), "source-id", **self.options)
        self.assertEqual(summary.skipped, 1)
        scrape.assert_not_called()

    @patch("scripts.ingestion.pipeline.extract_intelligence")
    @patch("scripts.ingestion.pipeline.scrape_url")
    def test_redirect_to_saved_article_skips_provider(self, scrape, extract):
        self.repository.article_exists.side_effect = [False, True]
        scrape.return_value = ScrapeResult(str(article("final").url), "html", article("final"))
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
        self.rows = {}
        self.events = []
        self.calls = []
        self.fail_next_insert = False

    @contextmanager
    def transaction(self):
        before = dict(self.rows)
        self.events.append("begin")
        try:
            yield
        except Exception:
            self.rows = before
            self.events.append("rollback")
            raise
        else:
            self.events.append("commit")

    def execute(self, sql, params):
        self.calls.append((sql, params))
        if sql.startswith("SELECT 1"):
            return Mock(fetchone=lambda: (1,) if params[0] in self.rows else None)
        if sql.startswith("INSERT"):
            self.rows[params[1]] = params
            if self.fail_next_insert:
                self.fail_next_insert = False
                raise RuntimeError("Simulated insert failure")
            return Mock(fetchone=lambda: ("item-id",))
        return Mock()


class RepositoryTests(unittest.TestCase):
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
