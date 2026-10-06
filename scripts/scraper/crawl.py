"""Command-line interface for the bounded article crawler."""

import argparse
import json
import sys
from dataclasses import asdict

from .crawler import crawl_site


def main() -> int:
    parser = argparse.ArgumentParser(description="Crawl public article pages on one hostname.")
    parser.add_argument("url", help="public starting URL, e.g. https://example.com/blog")
    parser.add_argument("--max-pages", type=int, default=20)
    parser.add_argument("--max-depth", type=int, default=1)
    parser.add_argument("--delay", type=float, default=1.0, help="minimum seconds between requests")
    args = parser.parse_args()
    try:
        result = crawl_site(
            args.url, max_pages=args.max_pages, max_depth=args.max_depth,
            request_delay=args.delay,
        )
    except ValueError as exc:
        print(f"Crawl failed: {exc}", file=sys.stderr)
        return 1
    output = {
        "seed_url": result.seed_url,
        "pages": [page.model_dump(mode="json") for page in result.pages],
        "failures": [asdict(failure) for failure in result.failures],
        "visited_urls": result.visited_urls,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if result.pages else 1


if __name__ == "__main__":
    raise SystemExit(main())
