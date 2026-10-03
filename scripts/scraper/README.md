# Single-page scraper and bounded crawler

Install the Python dependencies from the repository root:

```bash
python -m pip install -r scripts/requirements.txt
```

Run the fixed-URL example in `example.py`:

```bash
python -m scripts.scraper.example
```

Try the scraper on a URL of your choice:

```bash
python -m scripts.scraper.test_scrape https://example.com/article
```

The command prints the extracted title, text, author, date, and URL as JSON.

Application code can use the same flow directly:

```python
from scripts.scraper import scrape_url

page = scrape_url("https://example.com/article")
print(page.title, page.text)
```

`requests` fetches the page, and Trafilatura extracts its main text, title,
author, and publication date. JavaScript-rendered content may not be included.
The scraper does not bypass authentication, paywalls, CAPTCHAs, or other access
controls.

The extractor uses Trafilatura's precision-oriented parser without its fallback
parser. This avoids treating a lone navigation label as page content, though
unusual page layouts may be harder to extract. A local article fixture with
navigation and footer text retained the article body; a navigation/footer-only
fixture produced the expected no-content error. Invalid URL and simulated
request failure handling were also checked. A live run against the Python
documentation tutorial returned its title, publication date, and article text.
When a response omits its character set, the fetcher uses Requests' detected
encoding because Requests otherwise defaults to ISO-8859-1 for HTML responses.

## Crawling

Run a crawl from a public listing page:

```bash
python3 -B -m scripts.scraper.crawl https://example.com/blog --max-pages 5 --max-depth 1 --delay 1
```

Or call it from Python:

```python
from scripts.scraper import crawl_site

result = crawl_site("https://example.com/blog", max_pages=5, max_depth=1)
for page in result.pages:
    print(page.url, page.title)
for failure in result.failures:
    print(failure.url, failure.stage, failure.message)
```

The crawler visits pages in breadth-first order on the starting hostname. The
seed is depth 0; its links are depth 1. The page budget includes the seed and
failed attempts, but excludes robots.txt and redirect requests. Each page is
fetched once and its HTML is used both for extraction and link discovery.
Redirect destinations are checked before requesting them; an external redirect
is recorded as an access failure. Successful page results use the final URL.

The JSON result has `seed_url`, `pages`, `failures`, and `visited_urls` fields.
Each page has the same fields as the single-page result. Each failure has
`url`, `stage` (`access`, `fetch`, or `extract`), and `message`. An extraction
failure still permits link discovery, so a sparse index can lead to articles.
The CLI exits with status 0 if at least one page was extracted, otherwise 1.

By default, discovered URLs must contain an article-like section such as
`blog`, `news`, `reports`, or a year/month path. Tag, category, author, archive,
pagination, login, and common file URLs are excluded. The seed is always
attempted. Supply a `link_filter` function to adapt discovery to another site:

```python
result = crawl_site(
    "https://example.com/features",
    link_filter=lambda url: "/features/" in url,
)
```

URL normalization resolves relative links, removes fragments, lowercases the
hostname, and removes default ports. Query parameters and trailing slashes
remain distinct; canonical tags and equivalent tracking URLs are not merged.
Discovery reads anchor links from static HTML. JavaScript links are not followed.
The default article filter can miss unusual URLs or include listing pages.

The crawler caches robots.txt rules per origin and respects disallowed paths
and Crawl-delay. The default delay is one second between request starts,
including redirects. A missing robots.txt (HTTP 404) permits crawling; HTTP
401/403 blocks it. Network/server failures and rate limiting while reading
robots.txt stop requests to that origin.

## Files and functions

| File | Purpose |
| --- | --- |
| `crawler.py` | Queue, URL normalization, link discovery/filtering, and crawl rules. |
| `fetcher.py` | HTTP requests, redirects, and decoding. |
| `extractor.py` | Main text and metadata extraction. |
| `models.py` | Page and crawl result types. |
| `crawl.py` | CLI options and JSON output. |
| `__init__.py` | Public imports. |
| `tests/test_crawler.py` | Offline checks using fixture responses and the real extractor. |

Run the offline checks without fetching external websites:

```bash
python3 -B -m unittest scripts.scraper.tests.test_crawler -v
```
