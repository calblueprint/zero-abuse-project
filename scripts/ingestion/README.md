# Callable article ingestion

`ingest_url()` and `ingest_source()` connect the existing scraper to Carolyn's
`extract_intelligence()` and save successful intelligence records to PostgreSQL.
There is no ingestion CLI. Call these functions from Python application code or a job.

Install the repository's Python requirements. Set `DATABASE_URL` and
`OPENAI_API_KEY` (the OpenRouter credential used by the existing extractor).
Environment files are loaded by the caller, not as a side effect of importing
this package. For example, from code running at the repository root:

```python
import json
from dotenv import load_dotenv
from scripts.ingestion import ingest_url, ingest_source

load_dotenv(".env.local")

# Pick an existing source UUID from the sources table.
source_id = "YOUR_SOURCE_UUID"

# Process exactly one article, linked to that source.
summary = ingest_url("https://example.com/news/story", source_id)
print(json.dumps(summary.to_dict(), indent=2))

# Or crawl from that source's base_url, then process the discovered articles.
summary = ingest_source(source_id, max_pages=10, max_depth=1)
print(json.dumps(summary.to_dict(), indent=2))
```

Both calls return an `IngestionSummary`; neither prints on its own. `to_dict()`
returns JSON-compatible counts, per-page outcomes, visited URLs, timestamp-update
status, and run errors. For example:

```json
{
  "saved": 2,
  "skipped": 1,
  "failed": 1,
  "source_id": "YOUR_SOURCE_UUID",
  "pages": [
    {"url": "https://example.com/news/down", "status": "failed", "stage": "fetch", "message": "HTTP 500", "item_id": null},
    {"url": "https://example.com/news/old", "status": "skipped", "stage": "duplicate_check", "message": "Article already saved.", "item_id": null},
    {"url": "https://example.com/news/a", "status": "saved", "stage": "save", "message": null, "item_id": "ITEM_A_UUID"},
    {"url": "https://example.com/news/b", "status": "saved", "stage": "save", "message": null, "item_id": "ITEM_B_UUID"}
  ],
  "visited_urls": ["https://example.com/news", "https://example.com/news/down", "https://example.com/news/old", "https://example.com/news/a", "https://example.com/news/b"],
  "last_crawled_at_updated": true,
  "run_errors": []
}
```

## Flow and outcomes

- `ingest_url()` checks the requested URL for an existing item, calls
  `scrape_url()`, and passes the extracted `Article` to `process_article()`.
- `ingest_source()` loads the source's `base_url`, calls `crawl_site()`, and then
  calls `process_article()` for each returned article. The crawl completes before
  intelligence extraction starts. Source records explicitly marked inactive are rejected.
- `process_article()` checks the final URL (including redirect destinations),
  calls `extract_intelligence()`, then calls `save_intelligence()`.
- The default `PostgresRepository` writes into the existing `itel_items` table,
  assigning the supplied `source_id`, final URL, publication date, insertion
  timestamp, extracted title, summary (`tldr`), and classifications.

**Saved** means the insert transaction committed. **Skipped** means the normalized
URL already exists in `itel_items`, regardless of source. **Failed** means a page
could not be accessed, fetched, extracted, checked for duplicates, or saved. A
failed page does not stop other pages. Each save uses a separate transaction.
Expected intelligence failures carry the extractor's safe explanation; unexpected
exceptions expose only their type. Debug logging retains their tracebacks.

Source crawling retains existing hostname, robots, redirect, public-address,
request-delay, page-budget, and depth restrictions. `max_pages` counts attempted
pages, including listings and failed requests; it is not a target number of saved
articles. The seed is depth zero. Listing pages are traversed without becoming
intelligence records. Custom `article_filter` and `follow_filter` functions can
be passed to `ingest_source()` for publishers with different URL structures.
Discovery-only pages and links excluded by crawl policy are not counted as skipped.
There is no relevance-based skip rule.

`ingest_source()` updates `sources.last_crawled_at` to a timezone-aware UTC time
after article processing finishes, even if all attempted pages failed or no
articles were found. It means the source crawl attempt completed. A failed
timestamp write is returned in `run_errors`, leaving page counts intact.
`ingest_url()` never updates this source-wide timestamp. Invalid source IDs,
missing sources/base URLs, inactive sources, invalid limits, and configuration
errors raise before a completed crawl and do not advance the timestamp.

## Persistence boundaries

This change deliberately keeps the existing database schema and library queries.
Carolyn's classification lists (including geography objects) are stored as JSON
strings in the current varchar columns. They can be decoded without losing list
values, but the current library's exact scalar filters do **not** match individual
labels in those lists, and displays may show JSON text. Supporting that in the
library is a separate change. There is no database column for the extractor's
`description`, article body, or author, so this adapter does not persist those fields.

Duplicate checks normalize URLs using the crawler's existing rules. They do not
merge canonical tags, tracking parameters, or trailing-slash variants. An
additional check under a PostgreSQL transaction advisory lock prevents duplicate
saves by workers using this adapter. Other database writers must cooperate with
that locking convention; there is no new database uniqueness constraint.

## Calling from another application

You may pass `repository=` (implementing the `Repository` protocol) and `client=`
(the Instructor client accepted by `extract_intelligence()`) to either function.
Pass `model=` to override the extractor's existing `openrouter/free` default.
The pipeline closes resources it creates; caller-supplied resources stay open.
Use a dedicated database connection for each concurrently running ingestion call.
No credentials are loaded, connections opened, or requests made on import.

## Offline verification

```bash
python -B -m unittest tests.ingestion.test_ingestion tests.scraper.test_scraper tests.intelligence.test_intelligence_unit -v
```

These tests use fixture HTTP responses, mocked intelligence extraction, and test
repositories. They do not make provider calls or modify a live database.
