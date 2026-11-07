# Callable article ingestion

`ingest_url()` and `ingest_source()` connect the existing scraper to Carolyn's
`extract_intelligence()` and save relevant, validated intelligence records to PostgreSQL.
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
summary = ingest_source(source_id, max_pages=10, max_depth=2)
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
  "irrelevant": 0,
  "source_id": "YOUR_SOURCE_UUID",
  "pages": [
    {"url": "https://example.com/news/down", "status": "failed", "stage": "fetch", "message": "HTTP 500", "item_id": null},
    {"url": "https://example.com/news/old", "status": "skipped", "stage": "cache_check", "message": "Unchanged article already processed.", "item_id": null},
    {"url": "https://example.com/news/a", "status": "saved", "stage": "save", "message": null, "item_id": "ITEM_A_UUID"},
    {"url": "https://example.com/news/b", "status": "saved", "stage": "save", "message": null, "item_id": "ITEM_B_UUID"}
  ],
  "visited_urls": ["https://example.com/news", "https://example.com/news/down", "https://example.com/news/old", "https://example.com/news/a", "https://example.com/news/b"],
  "last_crawled_at_updated": true,
  "run_errors": []
}
```

## Flow and outcomes

- `ingest_url()` calls `scrape_url()` and passes the extracted `Article` to
  `process_article()`. Even saved URLs are fetched so changed text can be detected.
- `ingest_source()` loads the source's `base_url`, calls `crawl_site()`, and then
  calls `process_article()` for each returned article. The crawl completes before
  intelligence extraction starts. Source records explicitly marked inactive are rejected.
- `process_article()` checks the processing cache using the final URL (including
  redirect destinations), content fingerprint, and assessment configuration. A
  cache miss calls `screen_article()` with a bounded preview. Only a clear rejection
  stops there; other results proceed to `extract_intelligence()`. The save requires
  the full assessment to explicitly mark content relevant. Successful decisions
  from either stage are cached.
- The default `PostgresRepository` writes into the existing `itel_items` table,
  assigning the supplied `source_id`, final URL, publication date, insertion
  timestamp, extracted title, summary (`tldr`), and classifications.

**Saved** means the insert transaction committed. **Skipped** means the normalized
URL already exists in `itel_items`, regardless of source. **Failed** means a page
could not be accessed, fetched, extracted, checked, or saved. A
failed page does not stop other pages. Each save uses a separate transaction.
**Irrelevant** means the model assessed the content as unrelated or discovery-only;
it is not a duplicate or processing failure. Expected intelligence failures carry the extractor's safe explanation; unexpected
exceptions expose only their type. Debug logging retains their tracebacks.

Source crawling retains existing hostname, robots, redirect, public-address,
request-delay, page-budget, and depth restrictions. `max_pages` counts attempted
pages, including listings and failed requests; it is not a target number of saved
articles. The seed is depth zero. Listing pages are traversed without becoming
intelligence records. Custom `article_filter` and `follow_filter` functions can
be passed to `ingest_source()` for publishers with different URL structures.
Discovery-only pages and links excluded by crawl policy are not counted as skipped.
Irrelevant pages have a separate `irrelevant` status and count, with the
assessment's reason. They never reach the database insert. The repository also
rejects irrelevant results if called directly.

`ingest_source()` updates `sources.last_crawled_at` to a timezone-aware UTC time
after article processing finishes, even if all attempted pages failed or no
articles were found. It means the source crawl attempt completed. A failed
timestamp write is returned in `run_errors`, leaving page counts intact.
`ingest_url()` never updates this source-wide timestamp. Invalid source IDs,
missing sources/base URLs, inactive sources, invalid limits, and configuration
errors raise before a completed crawl and do not advance the timestamp.

## Short screening

On a cache miss, `screen_article()` sends only the title (up to 256 characters),
meta description (up to 512 characters), and opening extracted text (up to 1,200
characters). These are character limits, not token counts. The model returns a
`decision` (`irrelevant`, `potentially_relevant`, or `uncertain`) and a short `reason`.
Output is capped at 128 tokens. A clear `irrelevant` decision is cached and returned
with outcome stage `screening`, without requesting full intelligence or saving an item.

Both `potentially_relevant` and `uncertain` proceed to the existing full-text call.
Expected screening errors (provider errors, invalid output, or exhausted parsing)
also proceed to the full call; they are never treated as rejection. The short call
does not repeat malformed output, but retains the existing one-time JSON-format
fallback and underlying SDK transport retry behavior. Programming errors still
surface as page failures instead of silently changing the decision.

By default screening uses the same requested `model` and client as full extraction.
Pass `screening_model=` to either ingestion function to use another supported model
for the short call. That changes the cache fingerprint too. Cache hits make no model
calls. A clear rejection normally needs one short call; an accepted or uncertain
preview normally needs a short call plus a full call, excluding retries/fallback.
This reduces tokens when many pages are rejected, but savings and recall depend on
the source and model. Missing metadata is allowed and uncertainty should pass through.

## Full relevance contract

One structured model call returns `relevance` (`relevant` or `irrelevant`), a
nonblank `relevance_reason`, and `intelligence`. Relevant pages require the existing
validated intelligence object; irrelevant pages require `intelligence: null`.
Missing or inconsistent decisions fail validation and are not stored. Program
classifications are independent labels, not the admission rule.

The rubric includes child abuse prevention/protection, sexual abuse/exploitation,
related investigation and justice, and survivor support. News, research, guidance,
policy, and resources can qualify. General crime, AI, parenting, and education
without a concrete connection do not. Listings are rejected even when their links
mention relevant subjects. The decision is based on extracted page text and may be
wrong; provider quality should be evaluated with labeled examples before a large run.

The default crawl depth is now 2. Ordinary HTML paths are candidates, while known
listings and bounded pagination are used for discovery. No existing database records
are reclassified or deleted.

## Persistence boundaries

The existing intelligence table and library queries are unchanged. The separate
`processed_pages` table stores processing decisions.
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

## Processing cache

Apply the new `0009_cache_processed_pages` migration with `pnpm db:migrate` before
using this version of ingestion. The migration creates a table with RLS enabled
and no browser-client policies; use the existing trusted backend database connection.
No tables are created automatically by the Python code.

The cache keeps one row per normalized final URL: a SHA-256 hash of extracted text,
title, and meta description,
the assessment configuration fingerprint, relevance decision/reason, and assessment
timestamp. Article text and raw HTML are not stored in this table. The configuration
fingerprint includes both requested model IDs, prompts, output schemas, and screening limits;
changing any of these causes reassessment. It cannot detect a provider silently
changing the model behind the same ID (including the `openrouter/free` alias).

After fetching and extracting text:

- Unchanged irrelevant pages return `irrelevant` with the cached reason.
- Unchanged relevant pages with a saved library item return `skipped`.
- Changed text or preview metadata, changed configuration, or a missing cache row runs screening again.
- If a cached relevant item's library record was removed, it is assessed again.

Cache hits use the `cache_check` outcome stage. Both ingestion entry points share
this behavior. This saves model requests, not HTTP requests. Existing library URLs
without cache entries are assessed once to populate the cache. The existing
duplicate protection still prevents another insert; library entries are not
rewritten or deleted if their text or relevance changes.

Fetch/model failures and failed item saves are not cached, allowing retries. An
irrelevant decision is complete only after its cache write succeeds. A cache write
failure after an item has already committed preserves its saved outcome and adds a
warning in the page's message; a later run may reassess it. Concurrent runs can both
assess the same uncached page; this cache does not add a distributed work queue.

## Calling from another application

You may pass `repository=` (implementing the `Repository` protocol) and `client=`
(the Instructor client accepted by `extract_intelligence()`) to either function.
Pass `model=` to override the extractor's existing `openrouter/free` default, and
optionally `screening_model=` to choose a separate model for the short preview call.
The pipeline closes resources it creates; caller-supplied resources stay open.
Use a dedicated database connection for each concurrently running ingestion call.
`PostgresRepository(connection)` requires an idle connection with `autocommit=True`;
connections with autocommit disabled or an open transaction are rejected.
Custom repositories must also implement `get_processed_page()` and
`record_processing()` using the exported `ProcessedPage` record.
No credentials are loaded, connections opened, or requests made on import.

## Offline verification

```bash
python -B -m unittest tests.ingestion.test_ingestion tests.scraper.test_scraper tests.intelligence.test_intelligence_unit tests.intelligence.test_screening -v
```

These tests use fixture HTTP responses, mocked intelligence extraction, and test
repositories. They do not make provider calls or modify a live database.
