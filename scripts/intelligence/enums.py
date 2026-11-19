import json
from enum import Enum, StrEnum
from pathlib import Path


class USRegion(StrEnum):
    NORTHEAST = "Northeast"
    MIDWEST = "Midwest"
    SOUTH = "South"
    WEST = "West"
    EAST_COAST = "East Coast"
    WEST_COAST = "West Coast"


_taxonomy = json.loads(Path(__file__).with_name("taxonomy.json").read_text(encoding="utf-8"))
ExploitationType = Enum("ExploitationType", _taxonomy["exploitationTypes"], type=str)
Platform = Enum("Platform", _taxonomy["platforms"], type=str)
Technology = Enum("Technology", _taxonomy["technologies"], type=str)
AffectedPopulation = Enum("AffectedPopulation", _taxonomy["affectedPopulations"], type=str)
OffenderTactic = Enum("OffenderTactic", _taxonomy["offenderTactics"], type=str)
IntelligenceType = Enum("IntelligenceType", _taxonomy["intelTypes"], type=str)


class ZapProgramRelevance(str, Enum):
    PREVENTION_AND_EDUCATION = "Prevention & Education"
    INVESTIGATION_AND_JUSTICE = "Investigation & Justice"
    SURVIVOR_SUPPORT = "Survivor Support"
