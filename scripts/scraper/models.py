"""Result types for extracted pages."""

from dataclasses import dataclass, field
from typing import Literal

from scripts.models import Article


@dataclass(frozen=True, slots=True)
class FetchedPage:
    """Fetched HTML and its final URL after redirects."""

    url: str
    html: str
    content_type: str


@dataclass(frozen=True, slots=True)
class ScrapeResult:
    """Fetched HTML and the outcome of extracting its content."""

    url: str
    html: str
    page: Article | None
    extraction_error: str | None = None


@dataclass(frozen=True, slots=True)
class CrawlFailure:
    """A page that failed during access checks, fetching, or extraction."""

    url: str
    stage: Literal["access", "fetch", "extract", "validate"]
    message: str


@dataclass(slots=True)
class CrawlResult:
    """Successful pages, failures, and URLs attempted during a bounded crawl."""

    seed_url: str
    pages: list[Article] = field(default_factory=list)
    failures: list[CrawlFailure] = field(default_factory=list)
    visited_urls: list[str] = field(default_factory=list)
