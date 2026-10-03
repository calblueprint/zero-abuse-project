"""Run the sample article with: python -m scripts.pipeline.main."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from scripts.models import Article
from scripts.pipeline.pipeline import (
    ConfigurationError,
    ExtractionError,
    create_client,
    extract_intelligence,
)

logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTICLE = Path(__file__).resolve().parent / "fixtures" / "sample_article.json"

def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    load_dotenv(PROJECT_ROOT / ".env.local")

    try:
        article = Article.model_validate_json(DEFAULT_ARTICLE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.error("Cannot load article from %s (%s).", DEFAULT_ARTICLE, type(exc).__name__)
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
    raise SystemExit(main())
