import io
import json
import subprocess
import sys
import unittest
from unittest.mock import Mock
from zipfile import ZipFile

from scripts.documents.extract import DocumentError, MAX_BYTES, chunks, extract_sections
from scripts.documents.cli import DocumentMetadata, SectionSummary, extract_document, ingest_document
from scripts.intelligence.models import IntelligenceItem, ExtractedIntelligenceItem
from tests.intelligence.test_intelligence_unit import valid_intelligence


def archive(entries):
    output = io.BytesIO()
    with ZipFile(output, "w") as z:
        for name, text in entries.items():
            z.writestr(name, text)
    return output.getvalue()


class ReaderTests(unittest.TestCase):
    def test_txt_and_utf16(self):
        for data in [b"Report about protection.", "Report about protection.".encode("utf-16")]:
            self.assertEqual(extract_sections(data, "report.TXT"), ["Report about protection."])

    def test_invalid_empty_binary_and_oversized(self):
        for data, name in [(b"text", "x.exe"), (b"", "x.txt"),
                           (b"x" * (MAX_BYTES + 1), "x.txt"), (b"\x00binary", "x.txt"),
                           (b"pretend pdf", "x.pdf"), (b"not a zip", "x.docx")]:
            with self.subTest(name=name), self.assertRaises(DocumentError):
                extract_sections(data, name)

    def test_pdf_and_scan(self):
        from pypdf import PdfWriter
        from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
        writer = PdfWriter()
        page = writer.add_blank_page(width=612, height=792)
        font = DictionaryObject({NameObject("/Type"): NameObject("/Font"),
                                 NameObject("/Subtype"): NameObject("/Type1"),
                                 NameObject("/BaseFont"): NameObject("/Helvetica")})
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 72 720 Td (Child protection research.) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
        output = io.BytesIO()
        writer.write(output)
        self.assertIn("Child protection research.", extract_sections(output.getvalue(), "x.pdf")[0])
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        output = io.BytesIO()
        writer.write(output)
        with self.assertRaisesRegex(DocumentError, "OCR"):
            extract_sections(output.getvalue(), "scan.pdf")

    def test_docx_preserves_table_order(self):
        from docx import Document
        doc = Document()
        doc.add_paragraph("Before")
        doc.add_table(rows=1, cols=1).cell(0, 0).text = "Table finding"
        doc.add_paragraph("After")
        output = io.BytesIO()
        doc.save(output)
        self.assertEqual(extract_sections(output.getvalue(), "x.docx"), ["Before", "Table finding", "After"])

    def test_epub_uses_spine_not_archive_order(self):
        data = archive({
            "mimetype": "application/epub+zip",
            "META-INF/container.xml": '<container><rootfiles><rootfile full-path="OEBPS/package.opf"/></rootfiles></container>',
            "OEBPS/package.opf": '<package><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>',
            "OEBPS/a.xhtml": "<html><body>Later</body></html>",
            "OEBPS/b.xhtml": "<html><body>First<script>ignore()</script></body></html>",
        })
        self.assertEqual(extract_sections(data, "x.epub"), ["Chapter 1\nFirst", "Chapter 2\nLater"])

    def test_limits_expanded_archive_and_text(self):
        with self.assertRaises(DocumentError):
            extract_sections(archive({str(i): "" for i in range(2001)}), "x.docx")
        with self.assertRaisesRegex(DocumentError, "120,000"):
            extract_sections(b"A" * 120_001, "x.txt")

    def test_all_text_is_chunked(self):
        sections = ["A" * 13_000, "Relevant late finding"]
        self.assertEqual("".join(chunks(sections)), "\n\n".join(sections))


class ExtractionTests(unittest.TestCase):
    def test_long_document_includes_all_sections_without_relevance_gate(self):
        client = Mock()
        client.chat.completions.create.side_effect = [
            SectionSummary(findings="General introduction"),
            SectionSummary(findings="Later section findings"),
            IntelligenceItem(**valid_intelligence()),
        ]
        result = extract_document(["A" * 12_000, "Later section"], client=client, model="test", title="Report")
        calls = client.chat.completions.create.call_args_list
        self.assertEqual(len(calls), 3)
        final_text = calls[-1].kwargs["messages"][1]["content"]
        self.assertIn("General introduction", final_text)
        self.assertIn("Later section findings", final_text)
        self.assertNotIn("relevant", SectionSummary.model_fields)

    def test_unrelated_short_document_goes_directly_to_extraction(self):
        client = Mock()
        client.chat.completions.create.return_value = IntelligenceItem(**valid_intelligence(
            title="Garden planning", summary="The document explains planting schedules.",
        ))
        result = extract_document(["Plant tomatoes in spring."], client=client, model="test", title="Gardening")
        self.assertEqual(result.title, "Garden planning")
        self.assertEqual(result.zap_program_relevance, [])
        self.assertEqual(client.chat.completions.create.call_count, 1)
        messages = client.chat.completions.create.call_args.kwargs["messages"]
        self.assertIn("Plant tomatoes in spring.", messages[1]["content"])
        self.assertIn("regardless of its connection", messages[0]["content"])
        self.assertNotIn("For irrelevant pages return intelligence=null", messages[0]["content"])
        self.assertIs(client.chat.completions.create.call_args.kwargs["response_model"], ExtractedIntelligenceItem)

    def test_document_geography_uses_the_shared_resolver(self):
        client = Mock()
        client.chat.completions.create.return_value = ExtractedIntelligenceItem(**valid_intelligence(
            geography=[{"raw_extracted": {"country_code": "US", "state": "CA", "city": "Oakland"}}],
        ))
        result = extract_document(["A report from Oakland, California."], client=client, model="test", title="Report")
        self.assertEqual(result.geography[0].raw_extracted.city, "Oakland")
        self.assertEqual(result.geography[0].standardized.county_fips, "06001")

    def test_failed_section_does_not_generate_partial_intel(self):
        client = Mock()
        client.chat.completions.create.side_effect = [SectionSummary(findings="Introduction"), RuntimeError("Provider failure")]
        with self.assertRaises(RuntimeError):
            extract_document(["A" * 12_000, "Later section"], client=client, model="test", title="Report")
        self.assertEqual(client.chat.completions.create.call_count, 2)

    def test_failure_protocol_has_no_source_or_traceback(self):
        result = subprocess.run([sys.executable, "-B", "-m", "scripts.documents.cli", "bad.pdf"],
                                input=b"private document contents", capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout)["status"], "failed")
        self.assertNotIn(b"private", result.stdout + result.stderr)
        self.assertEqual(result.stderr, b"")


if __name__ == "__main__":
    unittest.main()
