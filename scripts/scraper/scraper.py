"""Main entry point for scraping one page."""

from collections.abc import Callable

import requests

from .extractor import ExtractionError, extract_page
from .fetcher import DEFAULT_MAX_RESPONSE_BYTES, DEFAULT_TIMEOUT_SECONDS, fetch_page_result
from .models import ScrapeResult


def scrape_url(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    session: requests.Session | None = None,
    before_request: Callable[[str], None] | None = None,
    max_response_bytes: int = DEFAULT_MAX_RESPONSE_BYTES,
) -> ScrapeResult:
    """Fetch and extract one page, preserving HTML when extraction fails.

    Invalid URLs raise ``ValueError``; request failures and non-HTML responses
    raise ``FetchError``. Extraction errors are returned in the result.
    """
    fetched = fetch_page_result(
        url,
        timeout=timeout,
        session=session,
        before_request=before_request,
        max_response_bytes=max_response_bytes,
    )

    try:
        page = extract_page(fetched.html, fetched.url)
    except ExtractionError as exc:
        return ScrapeResult(fetched.url, fetched.html, None, str(exc))
    return ScrapeResult(fetched.url, fetched.html, page)
