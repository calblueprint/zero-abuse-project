# Temporary document imports

Approved users can import one PDF, TXT, DOCX, or EPUB from the intelligence library.
Every successfully processed document produces one intel item, regardless of topic.
Uploaded documents bypass relevance checking.

This branch includes `pranav/improveWebsiteFilter`: websites retain preview screening,
full relevance assessment, and the processing cache. Document imports use the shared
structured-output helper with the raw `ExtractedIntelligenceItem` schema and the shared geography resolver, so website
relevance decisions and the URL processing cache are never used for uploads.
Both inputs save through the same Python repository item writer. The Next.js
upload endpoint handles authentication and validation, then delegates processing
and persistence to Python.

## Setup

Install `requirements.txt` into the project's `.venv` and apply migration
`0012_ephemeral_document_intel` with `pnpm db:migrate`. Set the existing
`DATABASE_URL` and `OPENAI_API_KEY` server environment variables. Optionally set
`DOCUMENT_PYTHON` to an absolute Python interpreter path and `DOCUMENT_INTEL_MODEL`
to a structured-output model. No storage bucket or extra service is needed.

The Next.js Node host must have Python and these dependencies available on Linux
or macOS and allow a request lasting up to 300 seconds. A JavaScript-only serverless
runtime cannot run this subprocess. The upload route's file tracing includes Python
sources; install the interpreter/dependencies separately in deployment. Proxy or
hosting request-size limits may be lower than the application's 8 MB limit.

## Processing and retention

The browser sends a bounded multipart request to an authenticated, same-origin
route. File bytes are passed to an isolated Python process over stdin. No source
file, extracted full text, section findings, or request body is written to disk or
the database by this feature. Text is sent to the existing OpenRouter model provider
for extraction; that provider's data handling is separate from application storage.

The subprocess has a 240-second wall timeout and up to 120 seconds of CPU time.
Linux workers also enforce a 768 MB data limit. macOS does not support this memory
limit, so it uses the CPU and wall timeout along with the file/text size limits. At most two document subprocesses run per Node instance. EPUB chapters
are read in spine order directly from ZIP; chapter links and external resources are
never fetched. DOCX paragraphs and tables are read in order. Scanned/empty PDF pages
require OCR, which is not included. Limits: 8 MB, 300 PDF pages, 120,000 extracted
characters, 2,000 ZIP entries, and 32 MB expanded ZIP contents.

Documents up to 12,000 characters go directly to validated intel
extraction. Longer documents are summarized section by section, with every section
contributing to the final intel item. There is no relevance decision or rejection;
unsupported classifications remain empty. Any section failure aborts the import
rather than saving an incomplete summary. The application stores only the generated
intel item, supplied source URL/date, filename, SHA-256 file hash, and normal
source/audit timestamps. A source URL is optional; unknown publication dates remain
unknown. Library cards without URLs have no source-download action.

All new imports use one **Uploaded documents** source. It is created lazily with a
stable UUID by the repository, inside the first item's transaction. A database lock
serializes first-time creation across workers; an item failure rolls back source
creation too. Later imports reuse that source and create only intel items. The
source's `added_by` identifies its initial creator, rather than each document's
uploader. Existing per-document sources from earlier versions are left intact.
No additional schema migration is required for this refactor.

Identical file bytes are deduplicated against saved intel items, including concurrent
saves (transaction lock and unique hash constraint). Modified files or differently
encoded copies may produce a new item. Failed uploads leave no row.
There is no durable queue or retry payload: keep the page open until completion;
after failure or interruption, upload the file again. No temporary file cleanup job
is needed because this implementation never creates temporary files.

## Verification

```sh
.venv/bin/python -B -m unittest tests.documents.test_documents tests.documents.test_persistence -v
pnpm run test:documents
pnpm run tsc
pnpm run lint
```

Tests cover all formats, malformed/oversized files, archive limits, table/chapter
order, scanned PDFs, direct extraction of unrelated documents, full-document summaries, shared source reuse, transactional rollback, shared item
field mapping, and safe subprocess failures without external
provider calls. A live model/database smoke test requires configured credentials
and an approved account.
