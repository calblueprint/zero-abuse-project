"""Small PostgreSQL adapter for ingestion; no database work occurs on import."""

import json
import os
from datetime import datetime
from typing import Protocol
from uuid import UUID
from urllib.parse import urlsplit

from scripts.intelligence.models import ExtractionResult, IntelligenceItem
from scripts.scraper.crawler import normalize_url

from .models import ProcessedPage, Source


# Stable identity lets all workers reuse one source without another schema change.
UPLOADED_DOCUMENTS_SOURCE_ID = "a51bd16c-e3a5-4c6f-bdd6-97aa19a1fa63"


class Repository(Protocol):
    def get_source(self, source_id: str) -> Source: ...
    def article_exists(self, url: str) -> bool: ...
    def get_processed_page(self, url: str) -> ProcessedPage | None: ...
    def record_processing(self, url: str, page: ProcessedPage) -> None: ...
    def save_intelligence(self, source_id: str, result: ExtractionResult) -> str | None: ...
    def update_last_crawled_at(self, source_id: str, at: datetime) -> None: ...


class PostgresRepository:
    """Own a dedicated autocommit connection; each write gets its own transaction."""

    def __init__(self, connection):
        from psycopg.pq import TransactionStatus

        if not connection.autocommit or connection.info.transaction_status != TransactionStatus.IDLE:
            raise ValueError("PostgresRepository requires an idle connection with autocommit=True.")
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

    def get_processed_page(self, url: str) -> ProcessedPage | None:
        row = self.connection.execute(
            """SELECT content_hash, assessment_key, relevance, relevance_reason
               FROM processed_pages WHERE source_url = %s""",
            (normalize_url(url),),
        ).fetchone()
        return ProcessedPage(*row) if row is not None else None

    def record_processing(self, url: str, page: ProcessedPage) -> None:
        with self.connection.transaction():
            self.connection.execute(
                """INSERT INTO processed_pages (
                    source_url, content_hash, assessment_key, relevance, relevance_reason
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (source_url) DO UPDATE SET
                    content_hash = EXCLUDED.content_hash,
                    assessment_key = EXCLUDED.assessment_key,
                    relevance = EXCLUDED.relevance,
                    relevance_reason = EXCLUDED.relevance_reason,
                    processed_at = now()""",
                (normalize_url(url), page.content_hash, page.assessment_key,
                 page.relevance, page.relevance_reason),
            )

    def save_intelligence(self, source_id: str, result: ExtractionResult) -> str | None:
        if result.relevance != "relevant" or result.intelligence is None:
            raise ValueError("Only relevant, validated intelligence can be saved.")
        if result.article.url is None:
            raise ValueError("Web ingestion requires a source URL.")
        return self._save_item(
            source_id, result.intelligence, source_url=str(result.article.url),
            published_at=result.article.published_at,
        )

    def document_exists(self, upload_hash: str) -> bool:
        return self.connection.execute(
            "SELECT 1 FROM itel_items WHERE upload_hash = %s LIMIT 1",
            (upload_hash,),
        ).fetchone() is not None

    def save_document(
        self, intelligence: IntelligenceItem, *, upload_hash: str,
        filename: str, uploaded_by: str, source_url: str | None = None,
        published_at: datetime | None = None,
    ) -> str | None:
        """Uploads bypass relevance assessment, then use the same item writer."""
        if len(upload_hash) != 64 or any(c not in "0123456789abcdef" for c in upload_hash):
            raise ValueError("Invalid document hash.")
        UUID(uploaded_by)
        return self._save_item(
            None, intelligence, source_url=source_url, published_at=published_at,
            upload_hash=upload_hash, filename=filename, uploaded_by=uploaded_by,
        )

    def _uploaded_documents_source(self, uploaded_by: str) -> str:
        # Called inside the item's transaction. Source creation rolls back if the
        # item fails; this lock also serializes first imports of different files.
        self.connection.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
            ("source:uploaded-documents",),
        )
        row = self.connection.execute(
            "SELECT source_id, is_active FROM sources WHERE source_id = %s",
            (UPLOADED_DOCUMENTS_SOURCE_ID,),
        ).fetchone()
        if row is not None:
            if row[1] is False:
                raise ValueError("Uploaded documents source is inactive.")
            return str(row[0])
        self.connection.execute(
            """INSERT INTO sources (source_id, name, type, is_active, added_by, added_at)
               VALUES (%s, 'Uploaded documents', 'document', true, %s, now())""",
            (UPLOADED_DOCUMENTS_SOURCE_ID, uploaded_by),
        )
        return UPLOADED_DOCUMENTS_SOURCE_ID

    def _save_item(
        self, source_id: str | None, intelligence: IntelligenceItem, *,
        source_url: str | None, published_at: datetime | None,
        upload_hash: str | None = None, filename: str | None = None,
        uploaded_by: str | None = None,
    ) -> str | None:
        """One field mapping, duplicate check, transaction, and INSERT for both inputs."""
        url = normalize_url(source_url) if source_url else None
        values = intelligence.model_dump(mode="json")
        fields = (
            "exploitation_type", "platform", "technology", "affected_population",
            "offender_tactic", "geography", "intel_type", "zap_program_relevance",
        )
        classifications = [json.dumps(values[key], ensure_ascii=False) for key in fields]
        with self.connection.transaction():
            self.connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                (f"document:{upload_hash}" if upload_hash else url,),
            )
            duplicate = self.document_exists(upload_hash) if upload_hash else self.article_exists(url)
            if duplicate:
                return None
            if upload_hash:
                source_id = self._uploaded_documents_source(uploaded_by)
            # Upload-only columns are appended so website saves retain their
            # original SQL shape and do not depend on the upload migration.
            extra_columns = ", upload_hash, upload_filename" if upload_hash else ""
            extra_params = ", %s, %s" if upload_hash else ""
            params = (source_id, url, published_at, values["title"], values["summary"], *classifications)
            if upload_hash:
                params += (upload_hash, filename)
            row = self.connection.execute(
                f"""INSERT INTO itel_items (
                    source_id, source_url, published_at, added_at, title, tldr,
                    exploitation_type, platform, technology, affected_population,
                    offender_tactic, geography, intel_type, zap_relevance{extra_columns}
                ) VALUES (%s, %s, %s, now(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s{extra_params})
                RETURNING item_id""",
                params,
            ).fetchone()
            item_id = str(row[0])
            self.save_locations(item_id, values["geography"])
            return item_id

    def save_locations(self, item_id: str, locations: list[dict]) -> None:
        for location in locations:
            standardized = location.get("standardized") or {}
            self.connection.execute(
                """INSERT INTO item_locations (
                    item_id, raw_extracted, country_code, state_code,
                    county_fips, county_name, city, regions, resolution_status
                ) VALUES (%s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s)""",
                (item_id, json.dumps(location["raw_extracted"], ensure_ascii=False),
                 standardized.get("country_code") or location["raw_extracted"].get("country_code"), standardized.get("state_code"),
                 standardized.get("county_fips"), standardized.get("county"),
                 standardized.get("city"), standardized.get("regions", []),
                 standardized.get("status", "unmatched")),
            )

    def update_last_crawled_at(self, source_id: str, at: datetime) -> None:
        with self.connection.transaction():
            row = self.connection.execute(
                "UPDATE sources SET last_crawled_at = %s WHERE source_id = %s RETURNING source_id",
                (at, source_id),
            ).fetchone()
            if row is None:
                raise ValueError("Source no longer exists.")
