"""Connect the scraper to intelligence extraction and persistence, without a CLI."""

from .models import IngestionSummary, PageOutcome, Source
from .pipeline import ingest_source, ingest_url, process_article
from .repository import PostgresRepository, Repository

__all__ = [
    "ingest_url", "ingest_source", "process_article", "IngestionSummary",
    "PageOutcome", "Source", "Repository", "PostgresRepository",
]
