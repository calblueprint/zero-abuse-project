"""Validated data contracts produced by intelligence extraction."""

import re
import unicodedata
from typing import Literal, Self, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)

from scripts.intelligence.enums import (
    AffectedPopulation,
    ExploitationType,
    IntelligenceType,
    OffenderTactic,
    Platform,
    Technology,
    USRegion,
    ZapProgramRelevance,
)
from scripts.models import Article

T = TypeVar("T")


class ExtractedLocation(BaseModel):
    """Raw extracted location by LLM."""

    model_config = ConfigDict(extra="forbid")
    # Require an explicit value or null for every field in the provider response.
    country_code: str | None = Field(
        pattern=r"^[A-Z]{2}$",
        description="Two-letter country code when supported by the article; otherwise null.",
    )
    state: str | None = Field(
        description=(
            "State or province belonging to this location, when identified in the "
            "article. Retain it alongside the city or county, using a two-letter "
            "code for US states and the stated name for foreign provinces."
        ),
    )
    city: str | None
    county: str | None
    region: str | None

    @field_validator("country_code", mode="before")
    @classmethod
    def normalize_country_code(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().upper() or None
        return value

    @field_validator("state", "city", "county", "region", mode="before")
    @classmethod
    def strip_location_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def reject_city_supported_only_by_county(self, info: ValidationInfo) -> Self:
        """A matching city in reference data is not evidence of a city mention."""
        article = (info.context or {}).get("article_text")
        if not self.city or not isinstance(article, str):
            return self

        # Only reject when every occurrence of the city name belongs to an
        # explicitly qualified county name. A separate city mention is allowed.
        article = " ".join(unicodedata.normalize("NFC", article).casefold().split())
        city = " ".join(unicodedata.normalize("NFC", self.city).casefold().split())
        name = rf"(?<!\w){re.escape(city)}(?!\w)"
        mentions = list(re.finditer(name, article))
        if not mentions:
            return self
        county_mentions = list(
            re.finditer(rf"{name}\s+county\b|\bcounty\s+of\s+{name}", article)
        )
        if all(
            any(
                county.start() <= mention.start() and mention.end() <= county.end()
                for county in county_mentions
            )
            for mention in mentions
        ):
            raise ValueError(
                f"The article names {self.city!r} only as a county, not a city. "
                "Set city to null and preserve the county and state."
            )
        return self


class StandardizedUSLocation(BaseModel):
    """Reference-matched fields, not verification of the underlying news.

    A city's inferred county is its primary county only. Status describes the
    supplied location: resolved = all supplied scopes matched; partial = some
    could not be matched; ambiguous = multiple candidates remain; unmatched =
    outside US coverage or no usable US location; conflict = supplied scopes
    disagree. Uncertain fields are omitted, and the original mention stays in
    raw_extracted. country_code is US only when US context is established.
    """

    model_config = ConfigDict(extra="forbid")
    country_code: Literal["US"] | None = None
    state_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    regions: list[USRegion] = Field(default_factory=list)
    county: str | None = None
    county_fips: str | None = Field(
        default=None,
        pattern=r"^\d{5}$",
        description="5-digit combined state and county FIPS",
    )
    city: str | None = None
    status: Literal["resolved", "partial", "ambiguous", "unmatched", "conflict"]


class ExtractedGeography(BaseModel):
    model_config = ConfigDict(extra="forbid")
    raw_extracted: ExtractedLocation


class Geography(ExtractedGeography):
    standardized: StandardizedUSLocation | None = None


class IntelligenceFields(BaseModel):
    """Fields shared by the provider response and enriched intelligence."""

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
    intel_type: list[IntelligenceType] = Field(
        description="All supported types of development.",
    )
    zap_program_relevance: list[ZapProgramRelevance] = Field(
        description="All supported ZAP program relevance categories.",
    )

    @field_validator(
        "exploitation_type",
        "platform",
        "technology",
        "affected_population",
        "offender_tactic",
        "intel_type",
        "zap_program_relevance",
    )
    @classmethod
    def remove_duplicates(cls, values: list[T]) -> list[T]:
        unique: list[T] = []
        for value in values:
            if value not in unique:
                unique.append(value)
        return unique


class ExtractedIntelligenceItem(IntelligenceFields):
    geography: list[ExtractedGeography] = Field(
        description=(
            "Locations connected to the development, including countries outside "
            "the US. Each entry represents one place together with its stated "
            "state/province and country, not separate entries for each level. "
            "Preserve named locations even when their country or state is "
            "uncertain; leave unknown fields null."
        ),
    )

    @field_validator("geography")
    @classmethod
    def remove_duplicate_geography(
        cls, values: list[ExtractedGeography]
    ) -> list[ExtractedGeography]:
        return cls.remove_duplicates(values)


class IntelligenceItem(IntelligenceFields):
    geography: list[Geography]

    @field_validator("geography")
    @classmethod
    def remove_duplicate_geography(cls, values: list[Geography]) -> list[Geography]:
        return cls.remove_duplicates(values)


class ExtractionResult(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    article: Article
    intelligence: IntelligenceItem
