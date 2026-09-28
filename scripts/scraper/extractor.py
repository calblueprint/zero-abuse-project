"""Extract page text and metadata from HTML."""

import json
from typing import Any

import trafilatura

from .fetcher import is_valid_url
from .models import ScrapedPage


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


def extract_page(html: str, url: str) -> ScrapedPage:
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

    return ScrapedPage(
        url=url,
        title=_optional_text(data.get("title")),
        text=text,
        published_date=_optional_text(data.get("date")),
        author=_optional_text(data.get("author")),
    )
