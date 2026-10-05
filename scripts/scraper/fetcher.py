"""Fetch HTML pages over HTTP."""

import re
from collections.abc import Callable
from urllib.parse import urljoin, urlsplit

import requests

from .models import FetchedPage


DEFAULT_TIMEOUT_SECONDS = 10
USER_AGENT = "ZeroAbuseScraper/0.1 (+public page content extraction)"


class FetchError(Exception):
    """Raised when a page request fails."""


def is_valid_url(url: str) -> bool:
    """Check that the URL is absolute and uses HTTP(S)."""
    if not isinstance(url, str) or not url.strip():
        return False

    try:
        parsed = urlsplit(url.strip())
        # Parsing the port also catches malformed port numbers.
        _ = parsed.port
    except ValueError:
        return False

    return parsed.scheme.lower() in {"http", "https"} and bool(parsed.hostname)


def fetch_page_result(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    session: requests.Session | None = None,
    before_request: Callable[[str], None] | None = None,
    max_redirects: int = 5,
) -> FetchedPage:
    """Return HTML and the final URL, checking each request before redirects."""
    if not is_valid_url(url):
        raise ValueError(f"Invalid URL: {url!r}. Expected an absolute HTTP(S) URL.")
    if timeout <= 0:
        raise ValueError("timeout must be greater than zero")

    if max_redirects < 0:
        raise ValueError("max_redirects must not be negative")

    client = session or requests.Session()
    current_url = url.strip()
    try:
        for hop in range(max_redirects + 1):
            if not is_valid_url(current_url):
                raise FetchError(f"Invalid redirect target: {current_url!r}")
            if before_request is not None:
                before_request(current_url)
            with client.get(
                current_url,
                timeout=timeout,
                headers={"User-Agent": USER_AGENT},
                allow_redirects=False,
            ) as response:
                response.raise_for_status()
                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("Location")
                    if not location:
                        raise FetchError("Redirect response has no Location header.")
                    if hop == max_redirects:
                        raise FetchError(f"Too many redirects while fetching {url!r}.")
                    current_url = urljoin(current_url, location)
                    continue
                content_type = response.headers.get("Content-Type", "")
                if not re.search(r"\bcharset\s*=", content_type, flags=re.IGNORECASE):
                    # Requests otherwise defaults HTML without a charset to Latin-1.
                    response.encoding = response.apparent_encoding
                return FetchedPage(
                    url=response.url or current_url,
                    html=response.text,
                    content_type=content_type,
                )
    except requests.RequestException as exc:
        raise FetchError(f"Failed to fetch {url!r}: {exc}") from exc
    finally:
        if session is None:
            client.close()
