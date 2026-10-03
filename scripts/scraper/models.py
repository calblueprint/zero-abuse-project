"""Result types for extracted pages."""

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class ScrapedPage:
    """Extracted page text and metadata.

    ``published_date`` stays as text because sites use different date formats.
    """

    url: str
    title: str | None
    text: str
    published_date: str | None = None
    author: str | None = None


@dataclass(frozen=True, slots=True)
class FetchedPage:
    """Fetched HTML and its final URL after redirects."""

    url: str
    html: str
    content_type: str


@dataclass(frozen=True, slots=True)
class CrawlFailure:
    """A page that failed during access checks, fetching, or extraction."""

    url: str
    stage: str
    message: str


@dataclass(slots=True)
class CrawlResult:
    """Successful pages, failures, and URLs attempted during a bounded crawl."""

    seed_url: str
    pages: list[ScrapedPage] = field(default_factory=list)
    failures: list[CrawlFailure] = field(default_factory=list)
    visited_urls: list[str] = field(default_factory=list)
