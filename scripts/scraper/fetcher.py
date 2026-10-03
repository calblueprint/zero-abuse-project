"""Fetch HTML pages over HTTP."""

import re
from urllib.parse import urlsplit

import requests


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


def fetch_page(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    session: requests.Session | None = None,
) -> str:
    """Fetch a page and return its HTML.

    Raises:
        ValueError: If ``url`` is not an absolute HTTP(S) URL.
        FetchError: If the request fails or the server returns an unsuccessful
            HTTP status. The original Requests exception is kept as the cause.
    """
    if not is_valid_url(url):
        raise ValueError(f"Invalid URL: {url!r}. Expected an absolute HTTP(S) URL.")
    if timeout <= 0:
        raise ValueError("timeout must be greater than zero")

    client = session or requests
    try:
        response = client.get(
            url.strip(),
            timeout=timeout,
            headers={"User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if not re.search(r"\bcharset\s*=", content_type, flags=re.IGNORECASE):
            # Requests defaults text/* responses without a declared charset to
            # ISO-8859-1. Prefer its detected encoding when the server omits one.
            response.encoding = response.apparent_encoding
        return response.text
    except requests.RequestException as exc:
        raise FetchError(f"Failed to fetch {url!r}: {exc}") from exc
