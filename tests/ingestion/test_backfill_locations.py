import unittest
from scripts.ingestion.backfill_locations import convert_locations


class BackfillLocationTests(unittest.TestCase):
    def test_legacy_us_country_and_state_preserve_original(self):
        locations = convert_locations('[{"country":"United States","state_or_jurisdiction":"California"}]')
        self.assertEqual(locations[0]["raw_extracted"]["country"], "United States")
        self.assertEqual(locations[0]["standardized"]["state_code"], "CA")

    def test_structured_locations_are_resolved_again(self):
        locations = convert_locations('[{"raw_extracted":{"country_code":"US","state":"CA","city":"Oakland","county":null,"region":null}}]')
        self.assertEqual(locations[0]["standardized"]["county_fips"], "06001")

    def test_unsupported_values_are_left_for_legacy_readers(self):
        for value in ['United States', 'null', '{}', '[]', '["US"]', '[{"country":"US"},"invalid"]']:
            with self.subTest(value=value):
                self.assertEqual(convert_locations(value), [])

    def test_foreign_country_is_preserved_without_guessing_us_state(self):
        location = convert_locations('[{"country":"Canada","state_or_jurisdiction":"Ontario"}]')[0]
        self.assertEqual(location["raw_extracted"]["country"], "Canada")
        self.assertEqual(location["standardized"], {"status": "unmatched"})
