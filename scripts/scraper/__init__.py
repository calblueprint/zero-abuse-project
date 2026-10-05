"""Scrape a page and access its extracted content."""

from .extractor import ExtractionError
from .crawler import crawl_site
from .fetcher import FetchError
from .models import CrawlFailure, CrawlResult, ScrapedPage, ScrapeResult
from .scraper import scrape_url

__all__ = [
    "ExtractionError", "FetchError", "ScrapedPage", "ScrapeResult", "scrape_url",
    "CrawlFailure", "CrawlResult", "crawl_site",
]
