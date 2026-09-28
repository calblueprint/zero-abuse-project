"""Scrape a page and access its extracted content."""

from .extractor import ExtractionError
from .fetcher import FetchError
from .models import ScrapedPage
from .scraper import scrape_url

__all__ = ["ExtractionError", "FetchError", "ScrapedPage", "scrape_url"]
