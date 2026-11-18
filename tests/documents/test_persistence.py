"""Both ingestion paths exercise the actual repository writer, without a live DB."""
import copy
import hashlib
import unittest
from contextlib import contextmanager
from unittest.mock import Mock, patch

from scripts.documents.cli import DocumentMetadata, ingest_document
from scripts.ingestion.repository import PostgresRepository, UPLOADED_DOCUMENTS_SOURCE_ID
from scripts.intelligence.models import IntelligenceItem, Geography, ExtractedLocation, StandardizedUSLocation
from tests.ingestion.test_ingestion import TransactionConnection, article, extraction
from tests.intelligence.test_intelligence_unit import valid_intelligence

UPLOADER = "9d802e5f-4f0a-4d89-ab74-f18f62559816"


class DocumentConnection(TransactionConnection):
    def __init__(self):
        super().__init__()
        self.sources = {}
        self.documents = {}

    @contextmanager
    def transaction(self):
        sources, documents = copy.deepcopy(self.sources), dict(self.documents)
        with super().transaction():
            try:
                yield
            except Exception:
                self.sources, self.documents = sources, documents
                raise

    def execute(self, sql, params):
        if sql.startswith("INSERT INTO item_locations"):
            self.calls.append((sql, params))
            raise RuntimeError("Location write failed")
        if "WHERE upload_hash" in sql:
            self.calls.append((sql, params))
            return Mock(fetchone=lambda: (1,) if params[0] in self.documents else None)
        if sql.startswith("SELECT source_id, is_active"):
            self.calls.append((sql, params))
            return Mock(fetchone=lambda: self.sources.get(params[0]))
        if sql.startswith("INSERT INTO sources"):
            self.calls.append((sql, params))
            if params[0] in self.sources:
                raise AssertionError("Attempted to create another shared source")
            self.sources[params[0]] = (params[0], True)
            return Mock()
        if sql.startswith("INSERT INTO itel_items") and "upload_hash" in sql:
            self.calls.append((sql, params))
            self.documents[params[-2]] = params
            if self.fail_next_insert:
                self.fail_next_insert = False
                raise RuntimeError("Simulated item failure")
            return Mock(fetchone=lambda: ("document-item-id",))
        return super().execute(sql, params)


class SharedPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.connection = DocumentConnection()
        self.repository = PostgresRepository(self.connection)
        self.intel = IntelligenceItem(**valid_intelligence(platform=["Discord", "Telegram"]))

    def save(self, content=b"first", **kwargs):
        return self.repository.save_document(
            self.intel, upload_hash=hashlib.sha256(content).hexdigest(),
            filename="report.txt", uploaded_by=UPLOADER, **kwargs,
        )

    def test_different_documents_and_repository_instances_reuse_one_source(self):
        self.save()
        self.repository = PostgresRepository(self.connection)
        self.save(b"second")
        self.assertEqual(len(self.connection.sources), 1)
        self.assertEqual(len(self.connection.documents), 2)
        for values in self.connection.documents.values():
            self.assertEqual(values[0], UPLOADED_DOCUMENTS_SOURCE_ID)
        inserts = [c for c in self.connection.calls if c[0].startswith("INSERT INTO sources")]
        self.assertEqual(len(inserts), 1)
        # Concurrent first imports cooperate on the same source lock before lookup.
        source_lock = next(i for i, c in enumerate(self.connection.calls) if c[1] == ("source:uploaded-documents",))
        lookup = next(i for i, c in enumerate(self.connection.calls) if c[0].startswith("SELECT source_id, is_active"))
        self.assertLess(source_lock, lookup)

    def test_duplicate_document_skips_source_creation_and_item_insert(self):
        self.save()
        self.assertIsNone(self.save())
        self.assertEqual(len(self.connection.documents), 1)
        self.assertEqual(len([c for c in self.connection.calls if c[0].startswith("INSERT INTO sources")]), 1)

    def test_item_failure_rolls_back_first_source_creation(self):
        self.connection.fail_next_insert = True
        with self.assertRaises(RuntimeError):
            self.save()
        self.assertEqual(self.connection.sources, {})
        self.assertEqual(self.connection.documents, {})
        self.assertEqual(self.save(), "document-item-id")

    def test_web_and_document_saves_share_classification_mapping(self):
        web = extraction(article("report"))
        self.repository.save_intelligence("website-source", web)
        self.intel = web.intelligence
        self.save(source_url="https://example.org/document")
        self.assertEqual(next(iter(self.connection.rows.values()))[3:],
                         next(iter(self.connection.documents.values()))[3:-2])
        self.assertEqual(next(iter(self.connection.documents.values()))[1], "https://example.org/document")

    def test_document_location_failure_rolls_back_source_and_item(self):
        self.intel.geography = [Geography(
            raw_extracted=ExtractedLocation(country_code="US", state="CA", city="Oakland", county=None, region=None),
            standardized=StandardizedUSLocation(country_code="US", state_code="CA", county_fips="06001", status="resolved"),
        )]
        with self.assertRaisesRegex(RuntimeError, "Location write failed"):
            self.save()
        self.assertEqual(self.connection.sources, {})
        self.assertEqual(self.connection.documents, {})

    def test_inactive_shared_source_blocks_saving(self):
        self.connection.sources[UPLOADED_DOCUMENTS_SOURCE_ID] = (UPLOADED_DOCUMENTS_SOURCE_ID, False)
        with self.assertRaisesRegex(ValueError, "inactive"):
            self.save()
        self.assertEqual(self.connection.documents, {})


class DocumentIngestionTests(unittest.TestCase):
    def setUp(self):
        self.repository = Mock()
        self.repository.document_exists.return_value = False
        self.repository.save_document.return_value = "item-id"
        self.metadata = DocumentMetadata(uploaded_by=UPLOADER)

    def test_existing_hash_skips_parsing_and_model_calls(self):
        self.repository.document_exists.return_value = True
        with patch("scripts.documents.cli.extract_sections") as reader, patch("scripts.documents.cli.create_client") as create:
            result = ingest_document(b"text", "x.txt", self.metadata, repository=self.repository)
        self.assertEqual(result["status"], "duplicate")
        reader.assert_not_called()
        create.assert_not_called()
        self.repository.save_document.assert_not_called()

    def test_unrelated_upload_is_saved_through_repository(self):
        client = Mock()
        client.chat.completions.create.return_value = IntelligenceItem(**valid_intelligence())
        result = ingest_document(b"Plant tomatoes in spring.", "garden.txt", self.metadata,
                                 repository=self.repository, client=client)
        self.assertEqual(result, {"status": "saved", "message": "Document added to the intelligence library.", "itemId": "item-id"})
        args = self.repository.save_document.call_args
        self.assertIsInstance(args.args[0], IntelligenceItem)
        self.assertEqual(args.kwargs["uploaded_by"], UPLOADER)
        self.assertIsNone(args.kwargs["source_url"])
        self.assertEqual(args.kwargs["upload_hash"], hashlib.sha256(b"Plant tomatoes in spring.").hexdigest())
        self.repository.close.assert_not_called()
        client.client.close.assert_not_called()

    def test_duplicate_detected_during_save_is_reported(self):
        self.repository.save_document.return_value = None
        with patch("scripts.documents.cli.extract_document", return_value=IntelligenceItem(**valid_intelligence())):
            result = ingest_document(b"text", "x.txt", self.metadata, repository=self.repository, client=Mock())
        self.assertEqual(result["status"], "duplicate")

    def test_failed_extraction_never_calls_save(self):
        with patch("scripts.documents.cli.extract_document", side_effect=RuntimeError("provider failure")):
            with self.assertRaises(RuntimeError):
                ingest_document(b"text", "x.txt", self.metadata, repository=self.repository, client=Mock())
        self.repository.save_document.assert_not_called()

    def test_owned_resources_close_when_saving_fails(self):
        client = Mock()
        self.repository.save_document.side_effect = RuntimeError("database failure")
        with patch("scripts.documents.cli.PostgresRepository.from_environment", return_value=self.repository), \
             patch("scripts.documents.cli.create_client", return_value=client), \
             patch("scripts.documents.cli.extract_document", return_value=IntelligenceItem(**valid_intelligence())):
            with self.assertRaises(RuntimeError):
                ingest_document(b"text", "x.txt", self.metadata)
        self.repository.close.assert_called_once()
        client.client.close.assert_called_once()
