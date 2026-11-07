import os
import unittest
from pathlib import Path

from dotenv import load_dotenv
from pydantic import HttpUrl

from scripts.intelligence.extractor import create_client, extract_intelligence
from scripts.models import Article

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env.local")


@unittest.skipUnless(
    os.getenv("OPENAI_API_KEY", "").strip(),
    "Set OPENAI_API_KEY to run provider-backed intelligence tests.",
)
class ProviderExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = create_client(os.getenv("OPENAI_API_KEY"))
        cls.model = "openrouter/free"

    @classmethod
    def tearDownClass(cls):
        assert cls.client.client is not None
        cls.client.client.close()

    def extract_relevance(self, article_text):
        result = extract_intelligence(
            Article(
                url=HttpUrl("https://example.com/article"), article_text=article_text
            ),
            client=self.client,
            model=self.model,
        )
        return set(result.intelligence.zap_program_relevance)

    def test_social_platform_risk_is_relevant_to_prevention_and_education(self):
        relevance = self.extract_relevance(
            "A new social-platform feature creates an emerging risk for teenagers. "
            "It could affect school, parent, or youth-facing guidance."
        )
        self.assertIn("Prevention & Education", relevance)

    def test_financial_sextortion_prosecution_is_relevant_to_investigation_and_justice(
        self,
    ):
        relevance = self.extract_relevance(
            "A federal prosecution involving financial sextortion through Discord "
            "and cryptocurrency was announced."
        )
        self.assertIn("Investigation & Justice", relevance)

    def test_financial_sextortion_research_is_relevant_to_survivor_support(self):
        relevance = self.extract_relevance(
            "New research examines the long-term psychological impact of financial "
            "sextortion on survivors and is intended to improve survivor support "
            "and mental-health resources."
        )
        self.assertIn("Survivor Support", relevance)

    def test_prosecution_and_survivor_research_can_receive_all_categories(self):
        relevance = self.extract_relevance(
            "An intelligence item about financial sextortion targeting adolescent "
            "boys includes a new prosecution involving law enforcement and research "
            "documenting survivor mental-health effects and recommending survivor "
            "support resources. The findings also inform prevention and youth-facing "
            "guidance."
        )
        self.assertEqual(
            {
                "Prevention & Education",
                "Investigation & Justice",
                "Survivor Support",
            },
            relevance,
        )

    def test_geographic_extraction_and_resolution(self):
        """Tests that the LLM extracts the raw city/state and the resolver standardizes it."""
        result = extract_intelligence(
            Article(
                url=HttpUrl("https://example.com/article"),
                article_text="Police in Oakland, California, announced a new task force today to combat online exploitation.",
            ),
            client=self.client,
            model=self.model,
        )

        geo_list = result.intelligence.geography
        details = f"Model: {self.model}; extracted geography: {geo_list!r}"
        self.assertGreater(len(geo_list), 0, details)

        oakland_geo = next(
            (
                g
                for g in geo_list
                if g.raw_extracted.city and "Oakland" in g.raw_extracted.city
            ),
            None,
        )
        self.assertIsNotNone(
            oakland_geo,
            f"Failed to extract 'Oakland' into raw_extracted.city. {details}",
        )

        assert oakland_geo is not None
        std = oakland_geo.standardized

        self.assertIsNotNone(std, details)
        assert std is not None
        self.assertEqual(std.status, "resolved", details)
        self.assertEqual(std.city, "Oakland", details)
        self.assertEqual(std.state_code, "CA", details)
        self.assertEqual(std.county_fips, "06001", details)
        self.assertEqual(std.regions, ["West", "West Coast"], details)

    def extract_geography(self, article_text):
        return extract_intelligence(
            Article(
                url=HttpUrl("https://example.com/article"), article_text=article_text
            ),
            client=self.client,
            model=self.model,
        ).intelligence.geography

    def test_region_only_geography_preserves_scope(self):
        geography = self.extract_geography(
            "Child protection organizations across the West Coast of the United "
            "States announced a joint online safety education campaign. "
            "No individual cities or states were identified."
        )
        self.assertTrue(
            any(
                geo.standardized is not None
                and geo.standardized.status == "resolved"
                and geo.standardized.regions == ["West", "West Coast"]
                and geo.standardized.state_code is None
                and geo.standardized.city is None
                for geo in geography
            ),
            f"Expected a region-only West Coast location. Received: {geography!r}",
        )

    def test_county_only_geography_does_not_invent_a_city(self):
        geography = self.extract_geography(
            "Officials in Alameda County, California, announced countywide "
            "funding for services supporting survivors of child abuse."
        )
        self.assertTrue(
            any(
                geo.standardized is not None
                and geo.standardized.status == "resolved"
                and geo.standardized.county_fips == "06001"
                and geo.standardized.city is None
                for geo in geography
            ),
            f"Expected Alameda County without an inferred city. Received: {geography!r}",
        )

    def test_mixed_countries_preserve_foreign_mentions_and_enrich_us_locations(self):
        geography = self.extract_geography(
            "Child protection teams in London, Ontario, Canada, and Oakland, "
            "California, United States, launched a joint survivor support project."
        )
        self.assertTrue(
            any(
                geo.raw_extracted.country_code == "CA"
                and geo.raw_extracted.city == "London"
                and geo.standardized is not None
                and geo.standardized.status == "unmatched"
                and geo.standardized.country_code is None
                for geo in geography
            ),
            "Expected the Canadian location to survive without US enrichment. "
            f"Received: {geography!r}",
        )
        self.assertTrue(
            any(
                geo.standardized is not None
                and geo.standardized.city == "Oakland"
                and geo.standardized.state_code == "CA"
                and geo.standardized.county_fips == "06001"
                for geo in geography
            ),
            f"Expected the US location to be enriched separately. Received: {geography!r}",
        )


if __name__ == "__main__":
    unittest.main()
