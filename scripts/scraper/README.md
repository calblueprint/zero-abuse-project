# Single-page scraper

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
