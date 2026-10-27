import re
import unicodedata
from collections import defaultdict
from functools import lru_cache
from typing import Any, Literal, Protocol

from rapidfuzz import fuzz, process

from scripts.intelligence.enums import USRegion
from scripts.intelligence.geo_reference import (
    County,
    GeoReferenceData,
    Place,
    load_reference_data,
    lookup_state,
)
from scripts.intelligence.models import (
    ExtractedLocation,
    StandardizedUSLocation,
)

# The following state-to-region mapping is based on the US Census Bureau's definition of regions and divisions:
REGION_STATES: dict[USRegion, str] = {
    USRegion.NORTHEAST: "CT ME MA NH RI VT NJ NY PA",
    USRegion.MIDWEST: "IN IL MI OH WI IA KS MN MO NE ND SD",
    USRegion.SOUTH: "DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX",
    USRegion.WEST: "AZ CO ID MT NV NM UT WY AK CA HI OR WA",
}
STATE_TO_REGION = {
    state: region
    for region, states in REGION_STATES.items()
    for state in states.split()
}
EAST_COAST_STATES = frozenset("ME NH MA RI CT NY NJ DE MD DC VA NC SC GA FL".split())
WEST_COAST_STATES = frozenset("CA OR WA".split())

MIN_FUZZY_NAME_LENGTH = 5
FUZZY_MIN_SCORE = 85
FUZZY_MIN_MARGIN = 5

_SAINT_REGEX = re.compile(r"\bst\.?\b")
_FORT_REGEX = re.compile(r"\bft\.?\b")
_PUNCTUATION_REGEX = re.compile(r"[^\w\s]")

_COUNTY_SUFFIX_REGEX = re.compile(
    r"\s+(county|parish|borough|census area|municipality)$"
)

_US_COUNTRY_PATTERN = r"(?:united states(?: of america)?|u\.?s\.?(?:a\.?)?)"
_US_PREFIX_REGEX = re.compile(rf"^(?:the )?{_US_COUNTRY_PATTERN} ")
_US_SUFFIX_REGEX = re.compile(rf" (?:of|in) (?:the )?{_US_COUNTRY_PATTERN}$")


def normalize_text(value: str) -> str:
    """Normalize case, common place-name abbreviations, punctuation and spaces."""
    value = unicodedata.normalize("NFC", value.casefold()).strip()
    value = _SAINT_REGEX.sub("saint", value)
    value = _FORT_REGEX.sub("fort", value)
    value = _PUNCTUATION_REGEX.sub("", value)
    return " ".join(value.split())


def normalize_county(value: str) -> str:
    value = normalize_text(value)
    return _COUNTY_SUFFIX_REGEX.sub("", value)


def _without_accents(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFD", value)
        if not unicodedata.combining(char)
    )


def _county_names(county: County) -> set[str]:
    names = {normalize_county(county.name), normalize_text(county.name)}
    if county.qualified_name:
        names.add(normalize_text(county.qualified_name))
    return names


def _regions_for_state(state_code: str) -> list[USRegion]:
    region = STATE_TO_REGION.get(state_code)
    regions = [region] if region else []
    if state_code in EAST_COAST_STATES:
        regions.append(USRegion.EAST_COAST)
    if state_code in WEST_COAST_STATES:
        regions.append(USRegion.WEST_COAST)
    return regions


def _lookup_region(value: str | None) -> USRegion | None:
    """Recognize a region label with an optional explicit US qualifier."""
    name = " ".join((value or "").casefold().split())
    name = _US_PREFIX_REGEX.sub("", name)
    name = _US_SUFFIX_REGEX.sub("", name)
    name = name.removeprefix("the ")
    # Match the entire remaining label: e.g. "West Coast of Canada" must not
    # become a US region merely because it contains "West Coast".
    return next(
        (region for region in USRegion if region.value.casefold() == name), None
    )


def _resolve_without_state(
    location: ExtractedLocation, requested_region: USRegion | None
) -> StandardizedUSLocation:
    """Keep explicit US country/region evidence without guessing a state."""
    if location.country_code != "US":
        return StandardizedUSLocation(status="unmatched")
    regions = [requested_region] if requested_region else []
    if requested_region == USRegion.WEST_COAST:
        regions = [USRegion.WEST, USRegion.WEST_COAST]
    unresolved = bool(
        location.state
        or location.city
        or location.county
        or (location.region and not requested_region)
    )
    return StandardizedUSLocation(
        country_code="US",
        regions=regions,
        status="partial" if unresolved else "resolved",
    )


class LocationResolver(Protocol):
    def standardize(self, location: ExtractedLocation) -> StandardizedUSLocation: ...


class USLocationResolver:
    """Resolve names; infer only the primary county for a city.

    Returned names come from reference data. Uncertain city/county fields are omitted,
    while reliable state/region fields remain available for broader filtering.
    """

    def __init__(self, reference: GeoReferenceData | None = None):
        reference = reference if reference is not None else load_reference_data()
        self.place_index: dict[tuple[str, str], set[Place]] = defaultdict(set)
        self.county_index: dict[tuple[str, str], set[County]] = defaultdict(set)
        for county in reference.counties:
            for name in _county_names(county):
                self.county_index[(county.state_code, _without_accents(name))].add(
                    county
                )
        for place in reference.places:
            for name in (place.city, *place.aliases):
                self.place_index[(place.state_code, normalize_text(name))].add(place)

        self.state_place_names: dict[str, list[str]] = defaultdict(list)
        for state, name in sorted(self.place_index):
            self.state_place_names[state].append(name)

    def _city_candidates(
        self,
        state: str,
        city: str,
        counties: set[County] | None,
    ) -> set[Place]:
        name = normalize_text(city)
        exact = self.place_index.get((state, name))
        if exact:
            return exact
        # Short fragments and partial-token matches are not reliable city evidence.
        if len(name) < MIN_FUZZY_NAME_LENGTH:
            return set()
        names = self.state_place_names.get(state, [])
        if counties is not None:
            names = [
                name
                for name in names
                if any(
                    place.primary_county in counties
                    for place in self.place_index[(state, name)]
                )
            ]
        # Include near misses below the acceptance threshold when measuring the
        # runner-up margin
        matches = process.extract(
            name,
            names,
            scorer=fuzz.ratio,
            score_cutoff=FUZZY_MIN_SCORE - FUZZY_MIN_MARGIN,
            limit=None,
        )
        scores: dict[Place, float] = {}
        for matched_name, score, _ in matches:
            for place in self.place_index[(state, matched_name)]:
                if counties is None or place.primary_county in counties:
                    scores[place] = max(score, scores.get(place, 0))
        if not scores:
            return set()
        best = max(scores.values())
        if best < FUZZY_MIN_SCORE:
            return set()
        # Return all candidates within the margin of the best score
        candidates = {
            place for place, score in scores.items() if best - score < FUZZY_MIN_MARGIN
        }
        return candidates

    def _lookup_county_name(self, state: str, name: str) -> set[County]:
        candidates = self.county_index.get((state, _without_accents(name)), set())
        # Prefer the supplied spelling. If only accent-insensitive matches exist,
        # keep all of them so collisions remain ambiguous.
        exact = {county for county in candidates if name in _county_names(county)}
        return exact or candidates

    def _county_candidates(self, state: str, county_name: str) -> set[County]:
        name = normalize_text(county_name)
        exact = self._lookup_county_name(state, name)
        if exact:
            return exact
        bare_name = normalize_county(county_name)
        candidates = self._lookup_county_name(state, bare_name)
        if name == bare_name:
            return candidates

        # Known qualified names were checked above. Do not strip a conflicting
        # suffix to turn e.g. Alexandria County into Alexandria city.
        return {county for county in candidates if county.qualified_name is None}

    def standardize(self, location: ExtractedLocation) -> StandardizedUSLocation:
        """Check country, resolve state/regions, then resolve county and city."""
        # Standardization only supported for US locations
        if location.country_code not in (None, "US"):
            return StandardizedUSLocation(status="unmatched")
        requested_region = _lookup_region(location.region)
        state = lookup_state(location.state) if location.state else None
        if state is None:
            return _resolve_without_state(location, requested_region)

        regions = _regions_for_state(state.abbr)
        if requested_region and requested_region not in regions:
            return StandardizedUSLocation(
                country_code="US",
                state_code=state.abbr,
                regions=regions,
                status="conflict",
            )
        return self._resolve_locality(
            location,
            state.abbr,
            regions,
            region_unresolved=bool(location.region and not requested_region),
        )

    def _resolve_locality(
        self,
        location: ExtractedLocation,
        state_code: str,
        regions: list[USRegion],
        *,
        region_unresolved: bool,
    ) -> StandardizedUSLocation:
        """Match county/city together, retaining only the supported fields."""
        fields: dict[str, Any] = {
            "country_code": "US",
            "state_code": state_code,
            "regions": regions,
        }
        resolved_status: Literal["partial", "resolved"] = (
            "partial" if region_unresolved else "resolved"
        )

        counties: set[County] = set()
        if location.county:
            # Preserve a qualified name (e.g. Baltimore city) before stripping
            # suffixes. Bare names may identify more than one jurisdiction.
            counties = self._county_candidates(state_code, location.county)
        if len(counties) == 1:
            county = next(iter(counties))
            fields.update(county=county.name, county_fips=county.fips)

        if not location.city:
            if location.county and len(counties) != 1:
                return StandardizedUSLocation(
                    **fields, status="ambiguous" if counties else "partial"
                )
            return StandardizedUSLocation(**fields, status=resolved_status)

        if location.county and not counties:
            # An unrecognized explicit county supplies no corroboration. Keep
            # only an exact city/alias match, without replacing the raw county.
            candidates = self.place_index.get(
                (state_code, normalize_text(location.city)), set()
            )
        else:
            candidates = self._city_candidates(
                state_code, location.city, counties or None
            )
        if counties and candidates:
            candidates = {p for p in candidates if p.primary_county in counties}
            if not candidates:
                # A primary-county reference cannot rule out a secondary county.
                # Keep only the agreed state/region until the discrepancy is reviewed.
                return StandardizedUSLocation(
                    country_code="US",
                    state_code=state_code,
                    regions=regions,
                    status="conflict",
                )
        if not candidates:
            return StandardizedUSLocation(
                **fields, status="ambiguous" if len(counties) > 1 else "partial"
            )
        if len(candidates) > 1:
            return StandardizedUSLocation(**fields, status="ambiguous")

        place = next(iter(candidates))
        if location.county and not counties:
            return StandardizedUSLocation(**fields, city=place.city, status="partial")
        fields.update(
            city=place.city,
            county=place.primary_county.name,
            county_fips=place.primary_county.fips,
        )
        return StandardizedUSLocation(**fields, status=resolved_status)


@lru_cache(maxsize=1)
def get_default_resolver() -> USLocationResolver:
    return USLocationResolver()
