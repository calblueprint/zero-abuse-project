"""Extract page text and metadata from HTML."""

import json
from datetime import datetime
from typing import Any

import trafilatura
from pydantic import TypeAdapter, ValidationError

from scripts.models import Article

from .fetcher import is_valid_url

MIN_FALLBACK_WORDS = 100


class ExtractionError(Exception):
    """Raised when the page has no useful text to extract."""


def _optional_text(value: Any) -> str | None:
    """Clean a metadata value, returning ``None`` when it is empty."""
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value if item)
    if value is None:
        return None
    value = str(value).strip()
    return value or None


_DATETIME_ADAPTER = TypeAdapter(datetime)


def _optional_datetime(value: Any) -> datetime | None:
    """Parse normalized extractor dates without rejecting useful article text."""
    value = _optional_text(value)
    if value is None:
        return None
    try:
        return _DATETIME_ADAPTER.validate_python(value)
    except ValidationError:
        return None


def _extract_metadata(html: str, url: str, *, fast: bool) -> dict[str, Any] | None:
    """Run Trafilatura and validate the shape of its JSON response."""
    extracted = trafilatura.extract(
        html,
        url=url,
        output_format="json",
        with_metadata=True,
        include_comments=False,
        include_tables=True,
        favor_precision=True,
        fast=fast,
    )
    if not extracted:
        return None

    try:
        data = json.loads(extracted)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ExtractionError("The content extractor returned invalid metadata.") from exc
    if not isinstance(data, dict):
        raise ExtractionError("The content extractor returned an unexpected result.")
    return data


def _fallback_is_substantial(text: str) -> bool:
    """Reject fallback results that look like isolated navigation or labels."""
    return len(text.split()) >= MIN_FALLBACK_WORDS


def extract_page(html: str, url: str) -> Article:
    """Extract the main text and available metadata from HTML.

    Missing metadata is returned as ``None``.

    Raises:
        ValueError: If ``url`` is not an absolute HTTP(S) URL.
        ExtractionError: If the HTML is empty, cannot be parsed, or contains no
            meaningful main text.
    """
    if not is_valid_url(url):
        raise ValueError(f"Invalid URL: {url!r}. Expected an absolute HTTP(S) URL.")
    if not isinstance(html, str) or not html.strip():
        raise ExtractionError("The fetched page is empty.")

    data = _extract_metadata(html, url, fast=True)
    text = _optional_text(data.get("text")) if data is not None else None
    if text is None:
        data = _extract_metadata(html, url, fast=False)
        text = _optional_text(data.get("text")) if data is not None else None
        if text is None or not _fallback_is_substantial(text):
            raise ExtractionError(f"No meaningful main content found at {url!r}.")

    assert data is not None
    return Article(
        url=url,
        article_text=text,
        source=_optional_text(data.get("sitename")) or _optional_text(data.get("hostname")),
        title=_optional_text(data.get("title")),
        author=_optional_text(data.get("author")),
        published_at=_optional_datetime(data.get("date")),
    )
