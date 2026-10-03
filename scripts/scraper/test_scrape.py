"""Try the scraper on any HTTP(S) page and print the extracted result.

Run from the repository root, for example:

    python -m scripts.scraper.test_scrape https://example.com/article

The scraper can only extract content that is available in the fetched HTML.
"""

import argparse
import json
import sys
from dataclasses import asdict

from .extractor import ExtractionError
from .fetcher import FetchError
from .scraper import scrape_url


def main() -> int:
    """Scrape the URL supplied on the command line and print its result."""
    parser = argparse.ArgumentParser(description="Fetch and extract one web page.")
    parser.add_argument("url", help="absolute HTTP(S) URL of the page to scrape")
    args = parser.parse_args()

    try:
        page = scrape_url(args.url)
    except (ValueError, FetchError, ExtractionError) as exc:
        print(f"Scrape failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(asdict(page), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
