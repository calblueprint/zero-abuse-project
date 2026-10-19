"""Small PostgreSQL adapter for ingestion; no database work occurs on import."""

import json
import os
from datetime import datetime
from typing import Protocol
from urllib.parse import urlsplit

from scripts.intelligence.models import ExtractionResult
from scripts.scraper.crawler import normalize_url

from .models import Source


class Repository(Protocol):
    def get_source(self, source_id: str) -> Source: ...
    def article_exists(self, url: str) -> bool: ...
    def save_intelligence(self, source_id: str, result: ExtractionResult) -> str | None: ...
    def update_last_crawled_at(self, source_id: str, at: datetime) -> None: ...


class PostgresRepository:
    """Own a dedicated autocommit connection; each write gets its own transaction."""

    def __init__(self, connection):
        self.connection = connection

    @classmethod
    def from_environment(cls):
        database_url = os.getenv("DATABASE_URL", "").strip()
        if not database_url:
            raise ValueError("Set DATABASE_URL or supply a repository.")
        import psycopg

        local = urlsplit(database_url).hostname in {"localhost", "127.0.0.1", "::1"}
        connection = psycopg.connect(
            database_url, autocommit=True, prepare_threshold=None,
            connect_timeout=10, sslmode="disable" if local else "require",
        )
        return cls(connection)

    def close(self) -> None:
        self.connection.close()

    def get_source(self, source_id: str) -> Source:
        row = self.connection.execute(
            "SELECT source_id, base_url, is_active FROM sources WHERE source_id = %s",
            (source_id,),
        ).fetchone()
        if row is None:
            raise ValueError("Source does not exist.")
        return Source(str(row[0]), row[1], row[2])

    def article_exists(self, url: str) -> bool:
        return self.connection.execute(
            "SELECT 1 FROM itel_items WHERE source_url = %s LIMIT 1",
            (normalize_url(url),),
        ).fetchone() is not None

    def save_intelligence(self, source_id: str, result: ExtractionResult) -> str | None:
        url = normalize_url(str(result.article.url))
        intelligence = result.intelligence.model_dump(mode="json")
        fields = (
            "exploitation_type", "platform", "technology", "affected_population",
            "offender_tactic", "geography", "intel_type", "zap_program_relevance",
        )
        # Preserve list values in the existing varchar columns, without a schema migration.
        classifications = [json.dumps(intelligence[key], ensure_ascii=False) for key in fields]
        with self.connection.transaction():
            # Serialize saves of the same URL by ingestion workers, then recheck.
            # Other writers must use this adapter too for this guarantee to hold.
            self.connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (url,),
            )
            if self.article_exists(url):
                return None
            row = self.connection.execute(
                """INSERT INTO itel_items (
                    source_id, source_url, published_at, added_at, title, tldr,
                    exploitation_type, platform, technology, affected_population,
                    offender_tactic, geography, intel_type, zap_relevance
                ) VALUES (%s, %s, %s, now(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING item_id""",
                (source_id, url, result.article.published_at,
                 intelligence["title"], intelligence["summary"], *classifications),
            ).fetchone()
            item_id = str(row[0])
        return item_id

    def update_last_crawled_at(self, source_id: str, at: datetime) -> None:
        with self.connection.transaction():
            row = self.connection.execute(
                "UPDATE sources SET last_crawled_at = %s WHERE source_id = %s RETURNING source_id",
                (at, source_id),
            ).fetchone()
            if row is None:
                raise ValueError("Source no longer exists.")
