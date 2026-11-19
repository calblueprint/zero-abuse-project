"""Bounded, in-memory PDF/TXT/DOCX/EPUB readers. No external resources fetched."""
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile
import xml.etree.ElementTree as ET

from charset_normalizer import from_bytes

MAX_BYTES = 8 * 1024 * 1024
MAX_TEXT = 120_000
MAX_EXPANDED = 32 * 1024 * 1024
FORMATS = {".pdf", ".txt", ".docx", ".epub"}


class DocumentError(ValueError):
    pass


def _zip(data):
    try:
        archive = ZipFile(BytesIO(data))
        entries = archive.infolist()
        if len(entries) > 2000 or sum(e.file_size for e in entries) > MAX_EXPANDED:
            raise DocumentError("Document archive exceeds processing limits.")
        if any(e.flag_bits & 1 for e in entries):
            raise DocumentError("Encrypted documents are not supported.")
        return archive
    except BadZipFile as exc:
        raise DocumentError("Invalid document archive.") from exc


def extract_sections(data: bytes, filename: str) -> list[str]:
    suffix = Path(filename).suffix.lower()
    if suffix not in FORMATS:
        raise DocumentError("Choose a PDF, TXT, DOCX, or EPUB file.")
    if not data or len(data) > MAX_BYTES:
        raise DocumentError("Choose a nonempty file no larger than 8 MB.")
    sections = []
    if suffix == ".txt":
        if b"\x00" in data[:4096] and not data.startswith((b"\xff\xfe", b"\xfe\xff")):
            raise DocumentError("This file does not appear to contain plain text.")
        decoded = from_bytes(data).best()
        if decoded is None:
            raise DocumentError("Unable to decode this text file.")
        sections = [str(decoded)]
    elif suffix == ".pdf":
        from pypdf import PdfReader
        if not data.startswith(b"%PDF-"):
            raise DocumentError("Invalid PDF file.")
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            raise DocumentError("Password-protected PDFs are not supported.")
        if len(reader.pages) > 300:
            raise DocumentError("PDFs are limited to 300 pages.")
        length = 0
        for number, page in enumerate(reader.pages, 1):
            stream = page.get_contents()
            if stream is not None and len(stream.get_data()) > MAX_EXPANDED:
                raise DocumentError("PDF page exceeds processing limits.")
            text = page.extract_text() or ""
            if not text.strip():
                raise DocumentError("PDF contains a page without readable text. OCR is required for scanned pages.")
            sections.append(f"Page {number}\n{text}")
            length += len(sections[-1])
            if length > MAX_TEXT:
                raise DocumentError("Document exceeds 120,000 characters. Upload a shorter excerpt.")
    elif suffix == ".docx":
        from docx import Document
        with _zip(data) as archive:
            if "word/document.xml" not in archive.namelist():
                raise DocumentError("Invalid DOCX file.")
        from docx.table import Table
        document = Document(BytesIO(data))
        for block in document.iter_inner_content():
            if isinstance(block, Table):
                sections.extend(" | ".join(cell.text for cell in row.cells) for row in block.rows)
            else:
                sections.append(block.text)
    else:
        # Read only local spine entries; never follow chapter links or load images.
        from lxml import html
        with _zip(data) as archive:
            if archive.read("mimetype").strip() != b"application/epub+zip":
                raise DocumentError("Invalid EPUB file.")
            if "META-INF/encryption.xml" in archive.namelist():
                raise DocumentError("Encrypted EPUBs are not supported.")
            container = ET.fromstring(archive.read("META-INF/container.xml"))
            rootfile = container.find(".//{*}rootfile")
            if rootfile is None:
                raise DocumentError("EPUB has no reading order.")
            package_path = rootfile.attrib["full-path"]
            package = ET.fromstring(archive.read(package_path))
            manifest = {i.attrib["id"]: i for i in package.findall("./{*}manifest/{*}item")}
            from urllib.parse import unquote, urlsplit
            import posixpath
            for index, item in enumerate(package.findall("./{*}spine/{*}itemref"), 1):
                chapter = manifest[item.attrib["idref"]]
                href = urlsplit(chapter.attrib["href"])
                if href.scheme or href.netloc:
                    raise DocumentError("EPUB contains an external chapter.")
                path = posixpath.normpath(posixpath.join(posixpath.dirname(package_path), unquote(href.path)))
                tree = html.fromstring(archive.read(path))
                for element in tree.xpath("//script|//style"):
                    element.drop_tree()
                sections.append(f"Chapter {index}\n{tree.text_content()}")
    sections = [s.strip() for s in sections if s.strip()]
    if not sections:
        raise DocumentError("No readable text found. Scanned PDFs require OCR.")
    if sum(map(len, sections)) > MAX_TEXT:
        raise DocumentError("Document exceeds 120,000 characters. Upload a shorter excerpt.")
    return sections


def chunks(sections: list[str], size=12_000):
    """Include every section, even when the relevant material appears at the end."""
    text = "\n\n".join(sections)
    for start in range(0, len(text), size):
        yield text[start:start + size]
