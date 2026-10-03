"""Shared data contracts for the Python ingestion pipeline."""

from datetime import datetime
from typing import TypeVar

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from scripts.enums import (
    AffectedPopulation,
    ExploitationType,
    IntelligenceType,
    OffenderTactic,
    Platform,
    Technology,
)

T = TypeVar("T")


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


class Geography(BaseModel):
    country: str = Field(
        min_length=1,
        description="Country explicitly connected to the development.",
    )
    state_or_jurisdiction: str | None = Field(
        default=None,
        description="State, province, territory, district, or other jurisdiction within the country, if available.",
    )


class IntelligenceItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    title: str = Field(
        min_length=1,
        description="Concise, factual title for the intelligence item.",
    )
    summary: str = Field(
        min_length=1,
        description="One- to two-sentence TLDR of the most important development.",
    )
    description: str = Field(
        min_length=1,
        description="More detailed, factual description of the development.",
    )
    exploitation_type: list[ExploitationType] = Field(
        description="All supported crime or abuse classifications.",
    )
    platform: list[Platform] = Field(
        description="Specific named digital products, services, or apps where the activity took place or that are the subject of the action.",
    )
    technology: list[Technology] = Field(
        description="The technical mediums or tools leveraged.",
    )
    affected_population: list[AffectedPopulation] = Field(
        description="All supported populations identified as targets or alleged victims.",
    )
    offender_tactic: list[OffenderTactic] = Field(
        description="Behaviors or tactics explicitly described, including attributed allegations.",
    )
    geography: list[Geography] = Field(
        description="Countries explicitly named in connection with the development, with a more specific state or jurisdiction when available.",
    )
    intel_type: list[IntelligenceType] = Field(
        description="All supported types of development.",
    )

    @field_validator(
        "exploitation_type",
        "platform",
        "technology",
        "affected_population",
        "offender_tactic",
        "geography",
        "intel_type",
    )
    @classmethod
    def remove_duplicates(cls, values: list[T]) -> list[T]:
        unique: list[T] = []
        for value in values:
            if value not in unique:
                unique.append(value)
        return unique


class ExtractionResult(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    article: Article
    intelligence: IntelligenceItem
