"""Shared data contracts for the Python ingestion pipeline."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class Article(BaseModel):
    """Validated article content passed from scraping to intelligence extraction."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    url: HttpUrl = Field(description="Final URL of the scraped article.")
    article_text: str = Field(min_length=1, description="Cleaned article text.")
    source: str | None = Field(
        default=None,
        description="Publisher or site name reported by the source, when available.",
    )
    title: str | None = None
    author: str | None = None
    published_at: datetime | None = None

    @field_validator("article_text")
    @classmethod
    def reject_blank_article(cls, value: str) -> str:
        """Reject whitespace-only content without rewriting the source text."""
        if not value.strip():
            raise ValueError("Article text must contain non-whitespace characters")
        return value
