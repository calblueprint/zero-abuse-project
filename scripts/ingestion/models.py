"""Outcomes returned by the callable ingestion pipeline."""

from dataclasses import asdict, dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Source:
    source_id: str
    base_url: str | None
    is_active: bool | None = True


@dataclass(frozen=True)
class PageOutcome:
    url: str
    status: Literal["saved", "skipped", "failed"]
    stage: str
    message: str | None = None
    item_id: str | None = None


@dataclass
class IngestionSummary:
    source_id: str
    pages: list[PageOutcome] = field(default_factory=list)
    visited_urls: list[str] = field(default_factory=list)
    last_crawled_at_updated: bool = False
    run_errors: list[str] = field(default_factory=list)

    @property
    def saved(self) -> int:
        return sum(page.status == "saved" for page in self.pages)

    @property
    def skipped(self) -> int:
        return sum(page.status == "skipped" for page in self.pages)

    @property
    def failed(self) -> int:
        return sum(page.status == "failed" for page in self.pages)

    def to_dict(self) -> dict:
        return {
            "saved": self.saved,
            "skipped": self.skipped,
            "failed": self.failed,
            **asdict(self),
        }
