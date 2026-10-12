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


if __name__ == "__main__":
    unittest.main()
