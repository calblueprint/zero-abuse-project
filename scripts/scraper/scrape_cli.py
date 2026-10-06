"""Scrape one HTTP(S) page and print the extracted result.

Run from the repository root, for example:

    python -m scripts.scraper.scrape_cli https://example.com/article

The scraper can only extract content that is available in the fetched HTML.
"""

import argparse
import json
import sys

from .fetcher import FetchError
from .scraper import scrape_url


def main() -> int:
    """Scrape the URL supplied on the command line and print its result."""
    parser = argparse.ArgumentParser(description="Fetch and extract one web page.")
    parser.add_argument("url", help="absolute HTTP(S) URL of the page to scrape")
    args = parser.parse_args()

    try:
        result = scrape_url(args.url)
    except (ValueError, FetchError) as exc:
        print(f"Scrape failed: {exc}", file=sys.stderr)
        return 1

    if result.page is None:
        print(f"Scrape failed: {result.extraction_error}", file=sys.stderr)
        return 1

    print(json.dumps(result.page.model_dump(mode="json"), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
