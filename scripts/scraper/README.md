# Single-page scraper

Install the Python dependencies from the repository root:

```bash
python -m pip install -r scripts/requirements.txt
```

Run the example scraper for calblueprint.org:

```bash
python -m scripts.scraper.script_test
```

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
