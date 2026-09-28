"""Result types for extracted pages."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ScrapedPage:
    """Extracted page text and metadata.

    ``published_date`` stays as text because sites use different date formats.
    """

    url: str
    title: str | None
    text: str
    published_date: str | None = None
    author: str | None = None
