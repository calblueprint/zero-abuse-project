"""Example usage for the scraper.

Run this example from the repository root with:

    python -m scripts.scraper.example

To try a different page, use the URL-taking command-line script in ``test_scrape.py``.
"""

import json
import sys
from dataclasses import asdict

from .extractor import ExtractionError
from .fetcher import FetchError
from .scraper import scrape_url

EXAMPLE_URL = "https://calblueprint.org/"


def main() -> int:
    """Fetch the example page and print its extracted fields as JSON."""
    try:
        page = scrape_url(EXAMPLE_URL)
    except (ValueError, FetchError, ExtractionError) as exc:
        print(f"Scrape failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(asdict(page), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
