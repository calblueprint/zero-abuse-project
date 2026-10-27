import csv
from dataclasses import dataclass
from pathlib import Path

import us
from us.states import State

DEFAULT_PLACES_PATH = Path(__file__).parent / "data" / "uscities.csv"
STATES_BY_CODE = {state.abbr: state for state in us.states.STATES_AND_TERRITORIES}
STATES_BY_NAME = {state.name.casefold(): state for state in STATES_BY_CODE.values()}

# Qualified Census names for independent cities and their same-named counties.
# These only qualify jurisdictions already present in the city CSV.
# Source: https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt
COUNTY_QUALIFIED_NAMES = {
    "24005": "Baltimore County",
    "24510": "Baltimore city",
    "29189": "St. Louis County",
    "29510": "St. Louis city",
    "32510": "Carson City",
    "51059": "Fairfax County",
    "51067": "Franklin County",
    "51159": "Richmond County",
    "51161": "Roanoke County",
    "51510": "Alexandria city",
    "51520": "Bristol city",
    "51530": "Buena Vista city",
    "51540": "Charlottesville city",
    "51550": "Chesapeake city",
    "51570": "Colonial Heights city",
    "51580": "Covington city",
    "51590": "Danville city",
    "51595": "Emporia city",
    "51600": "Fairfax city",
    "51610": "Falls Church city",
    "51620": "Franklin city",
    "51630": "Fredericksburg city",
    "51640": "Galax city",
    "51650": "Hampton city",
    "51660": "Harrisonburg city",
    "51670": "Hopewell city",
    "51678": "Lexington city",
    "51680": "Lynchburg city",
    "51683": "Manassas city",
    "51685": "Manassas Park city",
    "51690": "Martinsville city",
    "51700": "Newport News city",
    "51710": "Norfolk city",
    "51720": "Norton city",
    "51730": "Petersburg city",
    "51735": "Poquoson city",
    "51740": "Portsmouth city",
    "51750": "Radford city",
    "51760": "Richmond city",
    "51770": "Roanoke city",
    "51775": "Salem city",
    "51790": "Staunton city",
    "51800": "Suffolk city",
    "51810": "Virginia Beach city",
    "51820": "Waynesboro city",
    "51830": "Williamsburg city",
    "51840": "Winchester city",
}

# State-scoped aliases for the canonical CSV name.
CITY_ALIASES = {("NY", "New York"): ("New York City", "NYC")}


def lookup_state(value: str) -> State | None:
    """Accept exact state/territory names or postal codes."""
    value = value.strip()
    return STATES_BY_CODE.get(value.upper()) or STATES_BY_NAME.get(value.casefold())


@dataclass(frozen=True)
class County:
    name: str
    state_code: str
    fips: str
    qualified_name: str | None = None


@dataclass(frozen=True)
class Place:
    city: str
    state_code: str
    primary_county: County
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class GeoReferenceData:
    places: tuple[Place, ...]
    counties: tuple[County, ...]


def _county_from_row(row: dict[str, str]) -> County:
    state_code = row["state_id"].strip().upper()
    state = STATES_BY_CODE.get(state_code)
    name = row["county_name"].strip()
    fips = row["county_fips"].strip()
    if state is None or not name or not fips.isascii() or not fips.isdigit():
        raise ValueError("Invalid state, county name, or county FIPS")
    state_fips = state.fips
    if not state_fips:
        raise ValueError("State has no FIPS code")
    # Pad FIPS to 5 digits since some CSVs omit leading zeros
    fips = fips.zfill(5)
    if len(fips) != 5 or not fips.startswith(state_fips):
        raise ValueError("County FIPS must match the state FIPS prefix")
    return County(
        name=name,
        state_code=state_code,
        fips=fips,
        qualified_name=COUNTY_QUALIFIED_NAMES.get(fips),
    )


def load_reference_data(
    places_path: Path = DEFAULT_PLACES_PATH,
) -> GeoReferenceData:
    """Load places and primary counties from the SimpleMaps city CSV format.

    A city dataset is not assumed to contain every county in the US.
    """
    places: set[Place] = set()
    counties: dict[str, County] = {}
    path = Path(places_path)
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        fields = set(reader.fieldnames or [])
        required = {"city", "city_ascii", "state_id", "county_name", "county_fips"}
        if missing := required - fields:
            raise ValueError(f"{path}: missing columns: {', '.join(sorted(missing))}")
        for line_number, row in enumerate(reader, start=2):
            try:
                county = _county_from_row(row)
                previous = counties.get(county.fips)
                if previous is not None and previous != county:
                    raise ValueError("Conflicting names for one county FIPS")
                counties[county.fips] = county
                city = row["city"].strip()
                if not city:
                    raise ValueError("City name must not be blank")
                aliases = {row["city_ascii"].strip()}
                aliases.update(CITY_ALIASES.get((county.state_code, city), ()))
                places.add(
                    Place(
                        city=city,
                        state_code=county.state_code,
                        primary_county=county,
                        aliases=tuple(
                            sorted(alias.strip() for alias in aliases if alias.strip())
                        ),
                    )
                )
            except (AttributeError, TypeError, ValueError) as exc:
                raise ValueError(f"{path}:{line_number}: {exc}") from exc
    if not places:
        raise ValueError(f"{places_path}: no places found")
    return GeoReferenceData(
        places=tuple(
            sorted(
                places,
                key=lambda p: (p.state_code, p.city, p.primary_county.fips, p.aliases),
            )
        ),
        counties=tuple(sorted(counties.values(), key=lambda c: c.fips)),
    )
