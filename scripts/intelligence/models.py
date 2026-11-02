"""Validated data contracts produced by intelligence extraction."""

from typing import Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from scripts.intelligence.enums import (
    AffectedPopulation,
    ExploitationType,
    IntelligenceType,
    OffenderTactic,
    Platform,
    Technology,
    ZapProgramRelevance,
)
from scripts.models import Article

T = TypeVar("T")


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
    zap_program_relevance: list[ZapProgramRelevance] = Field(
        description="All supported ZAP program relevance categories.",
    )

    @field_validator(
        "exploitation_type",
        "platform",
        "technology",
        "affected_population",
        "offender_tactic",
        "geography",
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


class IntelligenceAssessment(BaseModel):
    """Required admission decision; unrelated pages need no invented intelligence."""

    model_config = ConfigDict(use_enum_values=True)

    relevance: Literal["relevant", "irrelevant"]
    relevance_reason: str = Field(min_length=1, description="Explain the decision using facts from the page.")
    intelligence: IntelligenceItem | None = Field(
        description="Validated intelligence for relevant substantive content; null for unrelated or listing pages.",
    )

    @field_validator("relevance_reason")
    @classmethod
    def reject_blank_reason(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Relevance reason must not be blank")
        return value

    @model_validator(mode="after")
    def validate_decision(self):
        if (self.relevance == "relevant") != (self.intelligence is not None):
            raise ValueError("Relevant content requires intelligence; irrelevant content requires null")
        return self


class ExtractionResult(IntelligenceAssessment):
    article: Article
