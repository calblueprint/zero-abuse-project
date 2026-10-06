"""Extract page text and metadata from HTML."""

import json
from datetime import datetime
from typing import Any

import trafilatura
from pydantic import TypeAdapter, ValidationError

from scripts.models import Article

from .fetcher import is_valid_url


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

    extracted = trafilatura.extract(
        html,
        url=url,
        output_format="json",
        with_metadata=True,
        include_comments=False,
        include_tables=True,
        favor_precision=True,
        # Disable Trafilatura's fallback parser: on sparse pages it can treat
        # a lone navigation label as the page's main content.
        fast=True,
    )
    if not extracted:
        raise ExtractionError(f"No extractable main content found at {url!r}.")

    try:
        data = json.loads(extracted)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ExtractionError("The content extractor returned invalid metadata.") from exc

    if not isinstance(data, dict):
        raise ExtractionError("The content extractor returned an unexpected result.")

    text = _optional_text(data.get("text"))
    if text is None:
        raise ExtractionError(f"No meaningful main text found at {url!r}.")

    return Article(
        url=url,
        article_text=text,
        source=_optional_text(data.get("sitename")) or _optional_text(data.get("hostname")),
        title=_optional_text(data.get("title")),
        author=_optional_text(data.get("author")),
        published_at=_optional_datetime(data.get("date")),
    )
