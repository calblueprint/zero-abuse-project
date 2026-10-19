"""Callable URL/source ingestion. Infrastructure errors before a run raise normally."""

import logging
import os
from contextlib import ExitStack, contextmanager
from datetime import datetime, timezone

from scripts.intelligence.extractor import ExtractionError, create_client, extract_intelligence
from scripts.models import Article
from scripts.scraper import crawl_site, scrape_url
from scripts.scraper.crawler import normalize_url

from .models import IngestionSummary, PageOutcome
from .repository import PostgresRepository, Repository

logger = logging.getLogger(__name__)


@contextmanager
def _resources(source_id, repository, client, model):
    if not model.strip():
        raise ValueError("Model must not be blank.")
    with ExitStack() as stack:
        if repository is None:
            repository = PostgresRepository.from_environment()
            stack.callback(repository.close)
        source = repository.get_source(source_id)
        if source.is_active is False:
            raise ValueError("Source is inactive.")
        if client is None:
            client = create_client(os.getenv("OPENAI_API_KEY"))
            stack.callback(client.client.close)
        yield source, repository, client


def _failure(url: str, stage: str, exc: Exception) -> PageOutcome:
    # Keep provider/database exception details (which may include credentials or
    # article contents) out of summaries. Logs retain the traceback for diagnosis.
    logger.debug("Page failed at %s", stage, exc_info=True)
    message = str(exc) if isinstance(exc, ExtractionError) else type(exc).__name__
    return PageOutcome(url, "failed", stage, message)


def process_article(
    article: Article, source_id: str, *, repository: Repository, client,
    model: str = "openrouter/free",
) -> PageOutcome:
    """Return one outcome; a bad article cannot abort the surrounding batch."""
    url = str(article.url)
    stage = "duplicate_check"
    try:
        if repository.article_exists(url):
            return PageOutcome(url, "skipped", stage, "Article already saved.")
        stage = "intelligence"
        result = extract_intelligence(article, client=client, model=model)
        stage = "save"
        item_id = repository.save_intelligence(source_id, result)
        if item_id is None:
            return PageOutcome(url, "skipped", stage, "Article already saved.")
        return PageOutcome(url, "saved", stage, item_id=item_id)
    except Exception as exc:
        return _failure(url, stage, exc)


def ingest_url(
    article_url: str, source_id: str, *, repository: Repository | None = None,
    client=None, model: str = "openrouter/free",
) -> IngestionSummary:
    """Scrape, extract, and save one URL. Does not update the source crawl timestamp."""
    url = normalize_url(article_url)
    with _resources(source_id, repository, client, model) as (_, repository, client):
        summary = IngestionSummary(source_id)
        stage = "duplicate_check"
        try:
            if repository.article_exists(url):
                summary.pages.append(PageOutcome(url, "skipped", stage, "Article already saved."))
                return summary
            stage = "scrape"
            summary.visited_urls.append(url)
            scraped = scrape_url(url)
            if scraped.page is None:
                summary.pages.append(PageOutcome(
                    scraped.url, "failed", "extract",
                    scraped.extraction_error or "No extractable content.",
                ))
            else:
                summary.pages.append(process_article(
                    scraped.page, source_id, repository=repository, client=client, model=model,
                ))
        except Exception as exc:
            summary.pages.append(_failure(url, stage, exc))
        return summary


def ingest_source(
    source_id: str, *, max_pages: int = 20, max_depth: int = 1,
    request_delay: float = 1.0, article_filter=None, follow_filter=None,
    repository: Repository | None = None, client=None, model: str = "openrouter/free",
) -> IngestionSummary:
    """Finish a bounded crawl, then process each article independently.

    Invalid crawl options raise before requests start. After a crawl returns,
    last_crawled_at records completion of the attempt, including partial failures.
    Caller-supplied database and extraction clients remain open.
    """
    with _resources(source_id, repository, client, model) as (source, repository, client):
        if not source.base_url:
            raise ValueError("Source has no base_url.")
        crawled = crawl_site(
            source.base_url, max_pages=max_pages, max_depth=max_depth,
            request_delay=request_delay, article_filter=article_filter,
            follow_filter=follow_filter, include_seed=False,
        )
        summary = IngestionSummary(source_id, visited_urls=crawled.visited_urls)
        summary.pages.extend(
            PageOutcome(failure.url, "failed", failure.stage, failure.message)
            for failure in crawled.failures
        )
        for article in crawled.pages:
            summary.pages.append(process_article(
                article, source_id, repository=repository, client=client, model=model,
            ))
        try:
            repository.update_last_crawled_at(source_id, datetime.now(timezone.utc))
            summary.last_crawled_at_updated = True
        except Exception as exc:
            summary.run_errors.append(f"last_crawled_at update failed ({type(exc).__name__}).")
        return summary
