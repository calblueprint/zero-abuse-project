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
text, source, title, author, and publication timestamp.

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
extracts its main text, title, author, publication date, and available source
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
failed attempts, but excludes robots.txt and redirect requests. Each page is
scraped through `scrape_url()` and its HTML is used for link discovery.
Redirect destinations are checked before requesting them; an external redirect
is recorded as an access failure. Successful page results use the final URL.

The JSON result has `seed_url`, `pages`, `failures`, and `visited_urls` fields.
Each page has the same fields as the single-page result. Each failure has
`url`, `stage` (`access`, `fetch`, or `extract`), and `message`. An extraction
failure still permits link discovery, so a sparse index can lead to articles.
The CLI exits with status 0 if at least one page was extracted, otherwise 1.

The conservative default filter follows article-like paths under blog, news,
article, post, report, press, and date-based sections. Tag, category, author,
archive, pagination, login, common file, and unrelated top-level URLs are
excluded. The seed is always attempted. Supply a `link_filter` function for a
source with a different URL structure:

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
python3 -B -m unittest discover -s tests -v
```
