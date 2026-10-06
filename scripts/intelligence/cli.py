"""Extract structured intelligence from an article JSON file."""

import argparse
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from scripts.intelligence.extractor import (
    ConfigurationError,
    ExtractionError,
    create_client,
    extract_intelligence,
)
from scripts.models import Article

logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main(article_path: Path) -> int:
    """Extract and print intelligence for a validated article JSON file."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    load_dotenv(PROJECT_ROOT / ".env.local")

    try:
        article = Article.model_validate_json(article_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.error(
            "Cannot load article from %s (%s).", article_path, type(exc).__name__
        )
        return 1

    client = None
    try:
        client = create_client(os.getenv("OPENAI_API_KEY"))
        result = extract_intelligence(article, client=client)
    except (ConfigurationError, ExtractionError) as exc:
        logger.error("%s", exc)
        return 1
    finally:
        if client is not None:
            assert client.client is not None
            client.client.close()

    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract structured intelligence from a scraped article JSON file."
    )
    parser.add_argument("article", type=Path, help="Path to an Article JSON file")
    arguments = parser.parse_args()
    raise SystemExit(main(arguments.article))
