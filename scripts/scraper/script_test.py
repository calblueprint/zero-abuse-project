"""Example: scrape the Blueprint website and print its extracted content."""

import json
import sys
from dataclasses import asdict

from .extractor import ExtractionError
from .fetcher import FetchError
from .scraper import scrape_url

URL = "https://calblueprint.org/"


def main() -> int:
    """Scrape the Blueprint site and print the result as JSON."""
    try:
        page = scrape_url(URL)
    except (ValueError, FetchError, ExtractionError) as exc:
        print(f"Scrape failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(asdict(page), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
