# Single-page scraper and bounded crawler

Install the Python dependencies from the repository root:

```bash
python -m pip install -r requirements.txt
```

Try the scraper on a URL of your choice:

```bash
python -m scripts.scraper.scrape_cli https://example.com/article
```

The command prints the validated shared `Article` fields as JSON: URL, article
text, source, title, meta description, author, and publication timestamp.

Application code can use the same flow directly:

```python
from scripts.scraper import scrape_url

result = scrape_url("https://example.com/article")
if result.page is not None:
    print(result.page.title, result.page.article_text)
else:
    print(result.extraction_error)
```

`scrape_url()` returns a `ScrapeResult` with `url` (the final URL), `html`,
`page` (the extracted `Article` or `None`), and `extraction_error` (a message
or `None`). The HTML is preserved if extraction fails so crawlers can still
discover links. Invalid URLs raise `ValueError`; request failures and non-HTML
responses raise `FetchError`. The single-page CLI prints only the extracted
page fields and reports failures without dumping raw HTML.

`requests` streams the page with a 10 MB response limit, and Trafilatura
extracts its main text, title, meta description, author, publication date, and available source
metadata into the shared `Article` contract. JavaScript-rendered content may
not be included.

The scraper does not bypass authentication, paywalls, CAPTCHAs, or other access
controls.

The extractor first uses Trafilatura's precision-oriented parser. When that
finds no meaningful text, it retries with Trafilatura's broader fallback parser
and accepts the result only when it contains at least 100 words. This recovers
substantial articles with unusual layouts without treating isolated navigation
labels as page content. A local article fixture with navigation and footer text
retained the article body; a navigation/footer-only fixture produced the
expected no-content error. Invalid URL and simulated request failure handling
were also checked.
When a response omits its character set, the fetcher detects the encoding from
the bounded response body instead of relying on Requests' HTML default.

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
article or discovery-page attempts, but excludes robots.txt and redirect
requests. Each page is scraped through `scrape_url()` and its HTML is used for
link discovery.
Redirect destinations are checked before requesting them; an external redirect
is recorded as an access failure. Successful page results use the final URL.

The JSON result has `seed_url`, `pages`, `failures`, and `visited_urls` fields.
Each page has the same fields as the single-page result. Each failure has
`url`, `stage` (`access`, `fetch`, or `extract`), and `message`. An extraction
failure on an article candidate still permits link discovery.
Discovery-only index pages are not added to `pages`, and their extraction
failures are not reported because their purpose is link traversal. The CLI
exits with status 0 if at least one article was extracted, otherwise 1.

The crawler accepts ordinary HTML paths without requiring a news/blog section or
publication date in the URL. Known index paths, category/tag/author/archive pages,
and pagination are traversed for links without becoming article results. Login,
account, checkout, search, contact, privacy/terms, and common non-HTML files remain
excluded. Unknown page structures are candidates; the intelligence assessment
rejects unrelated content and listings based on their extracted text.

Defaults are 20 attempted pages and depth 2, enough to reach a document through an
intermediate listing. At most three URL variants per hostname and path are queued
(`max_query_variants`); the page and depth limits also bound pagination. The seed
is always attempted but is returned only if it passes the article filter. Python
callers can explicitly set `include_seed=True` to return an extractable listing
seed as well. Redirect destinations are evaluated using their final URL.

Scraping alone does not assess relevance or save anything. Use
[`ingest_url()` or `ingest_source()`](../ingestion/README.md) to assess relevance
and save only relevant content. Both use the same admission rule.

Supply separate filters for a source with a different URL structure:

```python
result = crawl_site(
    "https://example.com/start",
    article_filter=lambda url: "/features/story/" in url,
    follow_filter=lambda url: url.endswith("/features"),
)
```

URL normalization resolves relative links, removes fragments, lowercases the
hostname, and removes default ports. Query parameters and trailing slashes
remain distinct; canonical tags and equivalent tracking URLs are not merged.
Discovery reads anchor links from static HTML. JavaScript links are not followed.

The crawler caches robots.txt rules per origin and respects disallowed paths
and Crawl-delay. The default delay is one second between request starts,
including redirects. A missing robots.txt (HTTP 404) permits crawling; HTTP
401/403 blocks it. Network/server failures and rate limiting while reading
robots.txt stop requests to that origin.

Before every page, robots, and redirect request, the fetcher rejects URLs that
resolve to loopback, private, link-local, reserved, or otherwise non-public IP
addresses. Applications should also allowlist source domains when their source
set is known. Page and robots responses have independent size limits.

## Files and functions

| File | Purpose |
| --- | --- |
| `crawler.py` | Queue, URL normalization, link discovery/filtering, and crawl rules. |
| `fetcher.py` | HTTP requests, redirects, and decoding. |
| `scraper.py` | Shared fetch-and-extract entry point used by the crawler and single-page scripts. |
| `extractor.py` | Main text and metadata extraction. |
| `scripts/models.py` | Shared validated `Article` contract. |
| `models.py` | Fetch, scrape, and crawl result types. |
| `crawl.py` | CLI options and JSON output. |
| `scrape_cli.py` | Single-page CLI options and JSON output. |
| `__init__.py` | Public imports. |
| `tests/scraper/test_scraper.py` | Offline checks using fixture responses and the real extractor. |

Run the offline checks without fetching external websites:

```bash
python3 -B -m unittest tests.scraper.test_scraper tests.intelligence.test_intelligence_unit tests.intelligence.test_screening tests.ingestion.test_ingestion -v
```
