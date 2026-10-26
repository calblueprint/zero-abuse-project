import tempfile
import unittest
import unicodedata
from pathlib import Path

from scripts.intelligence.geo_reference import (
    COUNTY_QUALIFIED_NAMES,
    County,
    GeoReferenceData,
    Place,
    load_reference_data,
)
from scripts.intelligence.location_resolver import USLocationResolver
from scripts.intelligence.models import ExtractedLocation


def make_location(
    *,
    country_code: str | None = None,
    state: str | None = None,
    city: str | None = None,
    county: str | None = None,
    region: str | None = None,
) -> ExtractedLocation:
    """Build a complete extraction fixture with explicit nulls for unknown fields."""
    return ExtractedLocation(
        country_code=country_code, state=state, city=city, county=county, region=region
    )


class LocationResolverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.resolver = USLocationResolver()

    def resolve(self, **kwargs):
        return self.resolver.standardize(make_location(**kwargs))

    def test_oakland_resolves_to_primary_county_and_region(self):
        result = self.resolve(city="Oakland", state="CA")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.city, "Oakland")
        self.assertEqual(result.county, "Alameda")
        self.assertEqual(result.county_fips, "06001")
        self.assertEqual(result.regions, ["West", "West Coast"])

    def test_typo_can_resolve_when_the_match_is_distinct(self):
        result = self.resolve(city="San Fransisco", state="California")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.city, "San Francisco")

    def test_short_city_fragment_does_not_guess(self):
        result = self.resolve(city="San", state="CA")
        self.assertEqual(result.status, "partial")
        self.assertIsNone(result.city)
        self.assertIsNone(result.county_fips)
        self.assertEqual(result.state_code, "CA")

    def test_state_only_is_fully_resolved_at_its_requested_scope(self):
        result = self.resolve(state=" ny ")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.state_code, "NY")
        self.assertEqual(result.regions, ["Northeast", "East Coast"])
        self.assertIsNone(result.city)

    def test_county_only_resolves_with_suffix_and_whitespace(self):
        result = self.resolve(county=" Alameda County ", state=" California ")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.county_fips, "06001")
        self.assertIsNone(result.city)

    def test_accented_counties_accept_unicode_variants_and_unaccented_spelling(self):
        for name in ("Doña Ana", unicodedata.normalize("NFD", "Doña Ana"), "Dona Ana"):
            for suffix in ("", " County"):
                with self.subTest(name=name, suffix=suffix):
                    raw = make_location(county=name + suffix, state="NM")
                    result = self.resolver.standardize(raw)
                    self.assertEqual(result.status, "resolved")
                    self.assertEqual(result.county, "Doña Ana")
                    self.assertEqual(result.county_fips, "35013")
                    self.assertEqual(raw.county, name + suffix)

    def test_city_agrees_with_unaccented_county(self):
        result = self.resolve(city="Las Cruces", county="Dona Ana County", state="NM")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.city, "Las Cruces")
        self.assertEqual(result.county, "Doña Ana")
        self.assertEqual(result.county_fips, "35013")

    def test_accent_fallback_preserves_collisions_and_prefers_exact_spelling(self):
        counties = (County("Peña", "NM", "35001"), County("Peńa", "NM", "35003"))
        resolver = USLocationResolver(GeoReferenceData((), counties))
        for name in ("Pena", "Pena County"):
            with self.subTest(name=name):
                result = resolver.standardize(make_location(county=name, state="NM"))
                self.assertEqual(result.status, "ambiguous")
                self.assertIsNone(result.county_fips)
        for county in counties:
            result = resolver.standardize(make_location(county=county.name, state="NM"))
            self.assertEqual(result.status, "resolved")
            self.assertEqual(result.county_fips, county.fips)
        plain = County("Pena", "NM", "35005")
        resolver = USLocationResolver(GeoReferenceData((), (*counties, plain)))
        result = resolver.standardize(make_location(county="Pena County", state="NM"))
        self.assertEqual(result.county_fips, plain.fips)

    def test_accent_fallback_preserves_jurisdiction_distinctions(self):
        city = County("Peña", "NM", "35001", "Peña city")
        county = County("Peña", "NM", "35003", "Peña County")
        resolver = USLocationResolver(GeoReferenceData((), (city, county)))
        for name, expected in (("Pena city", city), ("Pena County", county)):
            result = resolver.standardize(make_location(county=name, state="NM"))
            self.assertEqual(result.status, "resolved")
            self.assertEqual(result.county_fips, expected.fips)
        resolver = USLocationResolver(GeoReferenceData((), (city,)))
        result = resolver.standardize(make_location(county="Pena County", state="NM"))
        self.assertEqual(result.status, "partial")
        self.assertIsNone(result.county_fips)

    def test_decomposed_city_name_uses_exact_matching_even_for_short_names(self):
        county = County("Example", "NM", "35001")
        place = Place("Peña", "NM", county)
        resolver = USLocationResolver(GeoReferenceData((place,), (county,)))
        result = resolver.standardize(
            make_location(city=unicodedata.normalize("NFD", "Peña"), state="NM")
        )
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.city, "Peña")

    def test_county_disambiguates_same_named_cities(self):
        self.assertEqual(self.resolve(city="Lakeside", state="CA").status, "ambiguous")
        result = self.resolve(city="Lakeside", county="San Diego", state="CA")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.county_fips, "06073")

    def test_city_disambiguates_county_and_independent_city(self):
        cases = (
            ("Towson", "Baltimore", "MD", "24005"),
            ("Baltimore", "Baltimore", "MD", "24510"),
            ("Florissant", "St. Louis", "MO", "29189"),
            ("Richmond", "Richmond", "VA", "51760"),
        )
        for city, county, state, fips in cases:
            with self.subTest(city=city, county=county):
                result = self.resolve(city=city, county=county, state=state)
                self.assertEqual(result.status, "resolved")
                self.assertEqual(result.city, city)
                self.assertEqual(result.county_fips, fips)

    def test_qualified_county_names_distinguish_independent_cities(self):
        cases = (
            ("MD", "Baltimore", "24005", "24510"),
            ("MO", "St. Louis", "29189", "29510"),
            ("VA", "Fairfax", "51059", "51600"),
            ("VA", "Franklin", "51067", "51620"),
            ("VA", "Richmond", "51159", "51760"),
            ("VA", "Roanoke", "51161", "51770"),
        )
        for state, name, county_fips, city_fips in cases:
            for suffix, fips in (("County", county_fips), ("city", city_fips)):
                with self.subTest(state=state, name=name, suffix=suffix):
                    result = self.resolve(county=f"{name} {suffix}", state=state)
                    self.assertEqual(result.status, "resolved")
                    self.assertEqual(result.county_fips, fips)
                    self.assertIsNone(result.city)
            with self.subTest(state=state, bare_name=name):
                result = self.resolve(county=name, state=state)
                self.assertEqual(result.status, "ambiguous")
                self.assertIsNone(result.county_fips)

    def test_fuzzy_city_can_resolve_among_multiple_county_candidates(self):
        result = self.resolve(city="Towsn", county="Baltimore", state="MD")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.city, "Towson")
        self.assertEqual(result.county_fips, "24005")

    def test_qualified_independent_cities_outside_name_collisions(self):
        cases = (
            ("Alexandria city", "VA", "51510"),
            ("Virginia Beach city", "VA", "51810"),
            ("Falls Church city", "VA", "51610"),
            ("Carson City", "NV", "32510"),
        )
        for name, state, fips in cases:
            with self.subTest(name=name):
                result = self.resolve(county=name, state=state)
                self.assertEqual(result.status, "resolved")
                self.assertEqual(result.county_fips, fips)
                self.assertIsNone(result.city)

    def test_contradictory_jurisdiction_suffix_does_not_match(self):
        cases = (
            ("Alexandria County", "VA"),
            ("Virginia Beach County", "VA"),
            ("Carson City County", "NV"),
            ("Baltimore Parish", "MD"),
        )
        for name, state in cases:
            with self.subTest(name=name):
                result = self.resolve(county=name, state=state)
                self.assertEqual(result.status, "partial")
                self.assertIsNone(result.county_fips)
        result = self.resolve(city="Alexandria", county="Alexandria County", state="VA")
        self.assertEqual(result.city, "Alexandria")
        self.assertEqual(result.status, "partial")
        self.assertIsNone(result.county_fips)

    def test_city_in_a_county_name_is_not_treated_as_a_jurisdiction_suffix(self):
        county = County("James City", "VA", "51095")
        resolver = USLocationResolver(GeoReferenceData((), (county,)))
        result = resolver.standardize(
            make_location(county="James City County", state="VA")
        )
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.county_fips, "51095")

    def test_all_reviewed_qualified_names_resolve_to_the_expected_county(self):
        counties = {county.fips: county for county in load_reference_data().counties}
        for fips, qualified_name in COUNTY_QUALIFIED_NAMES.items():
            with self.subTest(name=qualified_name):
                county = counties[fips]
                result = self.resolve(county=qualified_name, state=county.state_code)
                self.assertEqual(result.status, "resolved")
                self.assertEqual(result.county_fips, fips)

    def test_uncertain_city_does_not_arbitrarily_choose_a_county(self):
        result = self.resolve(city="Atlantis", county="Baltimore", state="MD")
        self.assertEqual(result.status, "ambiguous")
        self.assertIsNone(result.city)
        self.assertIsNone(result.county_fips)

    def test_qualified_county_conflict_keeps_only_state_and_regions(self):
        result = self.resolve(city="Towson", county="Baltimore city", state="MD")
        self.assertEqual(result.status, "conflict")
        self.assertEqual(result.state_code, "MD")
        self.assertIsNone(result.city)
        self.assertIsNone(result.county_fips)

    def test_conflicting_county_is_not_silently_overwritten(self):
        result = self.resolve(city="Oakland", county="Los Angeles", state="CA")
        self.assertEqual(result.status, "conflict")
        self.assertEqual(result.state_code, "CA")
        self.assertIsNone(result.city)
        self.assertIsNone(result.county)

    def test_unknown_county_does_not_get_fuzzy_replaced(self):
        result = self.resolve(county="Atlantis", state="CA")
        self.assertEqual(result.status, "partial")
        self.assertIsNone(result.county)

    def test_unknown_county_preserves_exact_city_without_replacing_county(self):
        for county in ("Almeda", "Atlantis"):
            with self.subTest(county=county):
                raw = make_location(city="Oakland", county=county, state="CA")
                result = self.resolver.standardize(raw)
                self.assertEqual(result.status, "partial")
                self.assertEqual(result.city, "Oakland")
                self.assertEqual(result.state_code, "CA")
                self.assertIsNone(result.county)
                self.assertIsNone(result.county_fips)
                self.assertEqual(raw.county, county)

    def test_unknown_county_does_not_support_a_fuzzy_city_guess(self):
        result = self.resolve(city="Oaklnd", county="Almeda", state="CA")
        self.assertEqual(result.status, "partial")
        self.assertIsNone(result.city)

    def test_unknown_county_does_not_disambiguate_same_named_cities(self):
        result = self.resolve(city="Lakeside", county="Atlantis", state="CA")
        self.assertEqual(result.status, "ambiguous")
        self.assertIsNone(result.city)
        self.assertIsNone(result.county_fips)

    def test_unknown_city_keeps_an_explicit_county(self):
        result = self.resolve(city="Atlantis", county="Alameda", state="CA")
        self.assertEqual(result.status, "partial")
        self.assertEqual(result.county_fips, "06001")
        self.assertIsNone(result.city)

    def test_unknown_or_missing_state_does_not_guess(self):
        for state in (None, "Ocean", "Californa", "  "):
            with self.subTest(state=state):
                result = self.resolve(city="Oakland", state=state)
                self.assertEqual(result.status, "unmatched")
                self.assertIsNone(result.state_code)

    def test_foreign_country_prevents_us_matches_even_with_overlapping_names(self):
        cases = (
            {"country_code": "CA", "city": "London", "state": "Ontario"},
            {"country_code": "GB", "city": "London", "region": "West"},
            {"country_code": "CA", "city": "Oakland", "state": "CA"},
            {"country_code": "FR", "region": "Brittany"},
        )
        for fields in cases:
            with self.subTest(fields=fields):
                result = self.resolve(**fields)
                self.assertEqual(result.status, "unmatched")
                self.assertIsNone(result.country_code)
                self.assertIsNone(result.state_code)
                self.assertIsNone(result.city)
                self.assertIsNone(result.county_fips)
                self.assertEqual(result.regions, [])

    def test_unknown_country_does_not_default_to_us(self):
        raw = make_location(city="London")
        self.assertIsNone(raw.country_code)
        for location in (raw, make_location(region="West")):
            with self.subTest(location=location):
                result = self.resolver.standardize(location)
                self.assertEqual(result.status, "unmatched")
                self.assertIsNone(result.country_code)
                self.assertEqual(result.regions, [])

    def test_us_state_can_establish_country_without_explicit_country_code(self):
        result = self.resolve(city="Oakland", state="CA")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.country_code, "US")

    def test_country_only_is_resolved_only_for_us(self):
        result = self.resolve(country_code=" us ")
        self.assertEqual(result.country_code, "US")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(self.resolve(country_code="GB").status, "unmatched")

    def test_unsupported_scopes_keep_known_us_information(self):
        for fields in (
            {"city": "Atlantis"},
            {"state": "Unknown"},
            {"region": "Pacific Northwest"},
        ):
            with self.subTest(fields=fields):
                result = self.resolve(country_code="US", **fields)
                self.assertEqual(result.country_code, "US")
                self.assertEqual(result.status, "partial")
        result = self.resolve(city="Oakland", state="CA", region="Bay Area")
        self.assertEqual(result.city, "Oakland")
        self.assertEqual(result.status, "partial")

    def test_region_only_does_not_invent_a_state(self):
        result = self.resolve(country_code="US", region="Midwest")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.regions, ["Midwest"])
        self.assertIsNone(result.state_code)

    def test_state_region_conflict_is_explicit(self):
        result = self.resolve(state="CA", region="Northeast")
        self.assertEqual(result.status, "conflict")
        self.assertEqual(result.regions, ["West", "West Coast"])

    def test_region_matching_normalizes_case_and_internal_whitespace(self):
        for name in ("west coast", "WEST COAST", "West   Coast", "West\tCoast"):
            for state in (None, "CA"):
                with self.subTest(name=name, state=state):
                    raw = make_location(country_code="US", state=state, region=name)
                    result = self.resolver.standardize(raw)
                    self.assertEqual(result.status, "resolved")
                    self.assertEqual(result.regions, ["West", "West Coast"])
                    self.assertEqual(raw.region, name)
        self.assertEqual(
            self.resolve(state="CA", region="northeast").status, "conflict"
        )

    def test_invalid_state_preserves_supported_region_with_us_context(self):
        for region, expected in (
            ("west coast", ["West", "West Coast"]),
            ("MIDWEST", ["Midwest"]),
            ("East Coast", ["East Coast"]),
        ):
            with self.subTest(region=region):
                result = self.resolve(
                    country_code="US", state="Californa", region=region
                )
                self.assertEqual(result.status, "partial")
                self.assertEqual(result.country_code, "US")
                self.assertEqual(result.regions, expected)
                self.assertIsNone(result.state_code)

    def test_region_names_accept_explicit_us_qualifiers(self):
        regions = ("West Coast", "East Coast", "West", "South", "Midwest", "Northeast")
        for region in regions:
            for name in (
                f"{region} of the United States",
                f"the {region} of the United States of America",
                f"{region} in the U.S.",
                f"US {region}",
                f"U.S. {region}",
                f"USA {region}",
                f"United States {region}",
            ):
                with self.subTest(region=region, name=name):
                    raw = make_location(country_code="US", region=name)
                    result = self.resolver.standardize(raw)
                    expected = (
                        ["West", "West Coast"] if region == "West Coast" else [region]
                    )
                    self.assertEqual(result.status, "resolved")
                    self.assertEqual(result.regions, expected)
                    self.assertIsNone(result.state_code)
                    self.assertIsNone(result.city)
                    self.assertEqual(raw.region, name)

    def test_region_qualifiers_do_not_hide_state_or_country_conflicts(self):
        result = self.resolve(state="NY", region="West Coast of the United States")
        self.assertEqual(result.status, "conflict")
        self.assertEqual(result.regions, ["Northeast", "East Coast"])
        result = self.resolve(
            country_code="CA", region="West Coast of the United States"
        )
        self.assertEqual(result.status, "unmatched")
        self.assertEqual(result.regions, [])

    def test_region_matching_does_not_accept_foreign_or_compound_names(self):
        for name in (
            "West Coast of Canada", "West Coast of the United Kingdom",
            "Canadian West Coast", "West Coast and Midwest", "South America",
            "West Coast of the United States and Canada",
        ):
            with self.subTest(name=name):
                result = self.resolve(country_code="US", region=name)
                self.assertEqual(result.status, "partial")
                self.assertEqual(result.regions, [])

    def test_region_fallback_does_not_establish_us_context(self):
        for country in (None, "GB"):
            with self.subTest(country=country):
                result = self.resolve(
                    country_code=country, state="Unknown", region="west coast"
                )
                self.assertEqual(result.status, "unmatched")
                self.assertIsNone(result.country_code)
                self.assertEqual(result.regions, [])

    def test_new_york_uses_only_the_reference_primary_county(self):
        result = self.resolve(city="New York", state="NY")
        self.assertEqual(result.county, "Queens")

    def test_new_york_city_aliases_resolve_to_the_reference_name(self):
        for city in ("New York City", "NYC", " nyc "):
            with self.subTest(city=city):
                result = self.resolve(city=city, state="NY")
                self.assertEqual(result.status, "resolved")
                self.assertEqual(result.city, "New York")
                self.assertEqual(result.county, "Queens")
                self.assertEqual(result.county_fips, "36081")
        self.assertIsNone(self.resolve(city="NYC", state="CA").city)
        self.assertEqual(self.resolve(city="NYC").status, "unmatched")

    def test_city_alias_does_not_override_an_explicit_county_conflict(self):
        result = self.resolve(city="NYC", county="New York", state="NY")
        self.assertEqual(result.status, "conflict")
        self.assertIsNone(result.city)
        self.assertIsNone(result.county_fips)

    def test_dc_and_puerto_rico_have_no_invented_regions(self):
        result = self.resolve(state="DC", region="East Coast")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.regions, ["South", "East Coast"])
        result = self.resolve(state="PR")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.regions, [])

    def test_east_coast_overlaps_census_regions(self):
        self.assertEqual(self.resolve(state="NY").regions, ["Northeast", "East Coast"])
        self.assertEqual(self.resolve(state="FL").regions, ["South", "East Coast"])
        self.assertEqual(self.resolve(state="PA").regions, ["Northeast"])
        self.assertEqual(
            self.resolve(country_code="US", region="East Coast").regions, ["East Coast"]
        )
        self.assertEqual(
            self.resolve(state="NY", region="East Coast").status, "resolved"
        )

    def test_west_coast_overlaps_west_without_including_all_western_states(self):
        for state in ("CA", "OR", "WA"):
            with self.subTest(state=state):
                result = self.resolve(state=state, region="West Coast")
                self.assertEqual(result.regions, ["West", "West Coast"])
                self.assertEqual(result.status, "resolved")
        for state in ("NV", "AK", "HI"):
            with self.subTest(state=state):
                self.assertEqual(self.resolve(state=state).regions, ["West"])
                self.assertEqual(
                    self.resolve(state=state, region="West Coast").status, "conflict"
                )

    def test_west_coast_only_keeps_broader_region_without_inventing_state(self):
        result = self.resolve(country_code="US", region="West Coast")
        self.assertEqual(result.regions, ["West", "West Coast"])
        self.assertEqual(result.status, "resolved")
        self.assertIsNone(result.state_code)

    def test_fuzzy_ties_remain_ambiguous_regardless_of_reference_order(self):
        county = County("Example", "CA", "06001")
        places = (Place("Fairview", "CA", county), Place("Fairveiw", "CA", county))
        for ordered in (places, tuple(reversed(places))):
            with self.subTest(order=ordered):
                resolver = USLocationResolver(GeoReferenceData(ordered, (county,)))
                result = resolver.standardize(
                    make_location(city="Fairvew", state="CA")
                )
                self.assertEqual(result.status, "ambiguous")
                self.assertIsNone(result.city)

    def test_aliases_of_one_place_are_not_ambiguous(self):
        county = County("Example", "CA", "06001")
        place = Place("Saint Example", "CA", county, ("St. Example", "Example Town"))
        resolver = USLocationResolver(GeoReferenceData((place,), (county,)))
        result = resolver.standardize(
            make_location(city="Example Town", state="CA")
        )
        self.assertEqual(result.city, "Saint Example")
        self.assertEqual(result.status, "resolved")

    def test_fuzzy_aliases_of_one_place_are_not_competing_matches(self):
        county = County("Example", "CA", "06001")
        place = Place("Fairview", "CA", county, ("Fairveiw",))
        resolver = USLocationResolver(GeoReferenceData((place,), (county,)))
        result = resolver.standardize(make_location(city="Fairvew", state="CA"))
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.city, "Fairview")


class ReferenceDataTests(unittest.TestCase):
    def csv_path(self, contents):
        directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        path = directory / "reference.csv"
        path.write_text(contents, encoding="utf-8")
        return path

    def test_required_columns_are_validated(self):
        with self.assertRaisesRegex(ValueError, "missing columns"):
            load_reference_data(self.csv_path("city,state_id\nOakland,CA\n"))

    def test_current_csv_columns_are_required(self):
        for header, missing in (
            ("city,city_ascii,state_code,county_name,county_fips", "state_id"),
            ("city,state_id,county_name,county_fips", "city_ascii"),
        ):
            with self.subTest(header=header), self.assertRaisesRegex(
                ValueError, f"missing columns: {missing}"
            ):
                load_reference_data(self.csv_path(header + "\n"))

    def test_bad_county_fips_is_rejected_with_row_number(self):
        for fips in ("abc", "36001", "123456", ""):
            with self.subTest(fips=fips), self.assertRaisesRegex(
                ValueError, "reference.csv:2:"
            ):
                load_reference_data(
                    self.csv_path(
                        "city,city_ascii,state_id,county_name,county_fips\n"
                        f"Oakland,Oakland,CA,Alameda,{fips}\n"
                    )
                )

    def test_missing_or_empty_data_is_rejected(self):
        with self.assertRaises(FileNotFoundError):
            load_reference_data(Path("/does-not-exist/places.csv"))
        with self.assertRaisesRegex(ValueError, "no places"):
            load_reference_data(
                self.csv_path("city,city_ascii,state_id,county_name,county_fips\n")
            )

    def test_invalid_rows_report_their_line_number(self):
        header = "city,city_ascii,state_id,county_name,county_fips\n"
        for row in (
            ",Oakland,CA,Alameda,06001\n",
            "Oakland,Oakland,XX,Alameda,06001\n",
            "Oakland,Oakland,CA,,06001\n",
            "Oakland,Oakland,CA\n",
        ):
            with self.subTest(row=row), self.assertRaisesRegex(ValueError, "reference.csv:2:"):
                load_reference_data(self.csv_path(header + row))

    def test_conflicting_county_names_are_rejected(self):
        path = self.csv_path(
            "city,city_ascii,state_id,county_name,county_fips\n"
            "Oakland,Oakland,CA,Alameda,06001\n"
            "Berkeley,Berkeley,CA,Other County,06001\n"
        )
        with self.assertRaisesRegex(ValueError, "reference.csv:3: Conflicting names"):
            load_reference_data(path)

    def test_leading_zero_is_restored_and_blank_ascii_alias_is_ignored(self):
        path = self.csv_path(
            "city,city_ascii,state_id,county_name,county_fips\n"
            "Oakland,,CA,Alameda,6001\n"
        )
        reference = load_reference_data(path)
        self.assertEqual(reference.counties[0].fips, "06001")
        self.assertEqual(reference.places[0].aliases, ())
        result = USLocationResolver(reference).standardize(
            make_location(city="Oakland", state="CA")
        )
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.county_fips, "06001")

    def test_duplicate_rows_and_ascii_aliases_do_not_create_ambiguity(self):
        row = "Peña,Pena,CA,Alameda,06001\n"
        path = self.csv_path(
            "city,city_ascii,state_id,county_name,county_fips\n" + row + row
        )
        reference = load_reference_data(path)
        self.assertEqual(len(reference.places), 1)
        resolver = USLocationResolver(reference)
        result = resolver.standardize(make_location(city="Pena", state="CA"))
        self.assertEqual(result.city, "Peña")
        self.assertEqual(result.status, "resolved")


if __name__ == "__main__":
    unittest.main()
