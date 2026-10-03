"""Main entry point for scraping one page."""

from .extractor import extract_page
from .fetcher import fetch_page_html
from .models import ScrapedPage


def scrape_url(url: str) -> ScrapedPage:
    """Fetch a page and return its text and metadata.

    ``ValueError`` is raised for an invalid URL, ``FetchError`` for a failed
    HTTP request, and ``ExtractionError`` when useful content cannot be found.
    """
    html = fetch_page_html(url)
    return extract_page(html, url)
