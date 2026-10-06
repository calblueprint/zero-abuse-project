"""Fetch HTML pages over HTTP."""

import ipaddress
import re
import socket
from collections.abc import Callable
from urllib.parse import urljoin, urlsplit

import requests
from charset_normalizer import from_bytes

from .models import FetchedPage


DEFAULT_TIMEOUT_SECONDS = 10
DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024
USER_AGENT = "ZeroAbuseScraper/0.1 (+public page content extraction)"
_HTML_CONTENT_TYPES = {"text/html", "application/xhtml+xml"}


class FetchError(Exception):
    """Raised when a page request fails."""


class UnsafeUrlError(FetchError):
    """Raised when a URL could reach a non-public network address."""


def is_valid_url(url: str) -> bool:
    """Check that the URL is structurally valid and uses HTTP(S)."""
    if not isinstance(url, str) or not url.strip():
        return False

    try:
        parsed = urlsplit(url.strip())
        # Parsing the port also catches malformed port numbers.
        _ = parsed.port
    except ValueError:
        return False

    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        return False
    if parsed.username is not None or parsed.password is not None:
        return False
    if any(character.isspace() for character in parsed.netloc):
        return False
    return parsed.port != 0


def ensure_public_url(url: str) -> None:
    """Reject URLs resolving to loopback, private, or otherwise non-public IPs.

    This check is repeated before every request and redirect. Applications should
    additionally allowlist trusted source domains when their source set is known.
    """
    if not is_valid_url(url):
        raise UnsafeUrlError(f"Unsafe or invalid URL: {url!r}")

    parsed = urlsplit(url.strip())
    hostname = parsed.hostname
    assert hostname is not None
    if hostname.lower() == "localhost" or hostname.lower().endswith(".localhost"):
        raise UnsafeUrlError(f"URL hostname is not public: {hostname!r}")

    try:
        addresses = {ipaddress.ip_address(hostname)}
    except ValueError:
        port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
        try:
            records = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
        except socket.gaierror as exc:
            raise FetchError(f"Could not resolve URL hostname {hostname!r}: {exc}") from exc
        addresses = {
            ipaddress.ip_address(record[4][0].split("%", 1)[0])
            for record in records
        }

    if not addresses or any(not address.is_global for address in addresses):
        raise UnsafeUrlError(
            f"URL hostname does not resolve exclusively to public IPs: {hostname!r}"
        )


def read_limited_body(response: requests.Response, max_bytes: int) -> bytes:
    """Read a streamed response while enforcing a decoded-byte limit."""
    if isinstance(max_bytes, bool) or not isinstance(max_bytes, int) or max_bytes < 1:
        raise ValueError("max_bytes must be a positive integer")

    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            if int(content_length) > max_bytes:
                raise FetchError(f"Response exceeds the {max_bytes}-byte limit")
        except ValueError:
            pass

    body = bytearray()
    for chunk in response.iter_content(chunk_size=64 * 1024):
        if not chunk:
            continue
        body.extend(chunk)
        if len(body) > max_bytes:
            raise FetchError(f"Response exceeds the {max_bytes}-byte limit")
    return bytes(body)


def _decode_html(body: bytes, content_type: str) -> str:
    """Decode HTML using its declared charset or content-based detection."""
    match = re.search(r"\bcharset\s*=\s*['\"]?([^;\s'\"]+)", content_type, re.IGNORECASE)
    encoding = match.group(1) if match else None
    if encoding is None:
        best_match = from_bytes(body).best()
        encoding = best_match.encoding if best_match is not None else "utf-8"
    try:
        return body.decode(encoding, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def fetch_page_result(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    session: requests.Session | None = None,
    before_request: Callable[[str], None] | None = None,
    max_redirects: int = 5,
    max_response_bytes: int = DEFAULT_MAX_RESPONSE_BYTES,
) -> FetchedPage:
    """Return HTML and the final URL, checking each request before redirects."""
    if not is_valid_url(url):
        raise ValueError(f"Invalid URL: {url!r}. Expected an absolute HTTP(S) URL.")
    if timeout <= 0:
        raise ValueError("timeout must be greater than zero")

    if max_redirects < 0:
        raise ValueError("max_redirects must not be negative")
    if (
        isinstance(max_response_bytes, bool)
        or not isinstance(max_response_bytes, int)
        or max_response_bytes < 1
    ):
        raise ValueError("max_response_bytes must be a positive integer")

    client = session or requests.Session()
    current_url = url.strip()
    try:
        for hop in range(max_redirects + 1):
            if not is_valid_url(current_url):
                raise FetchError(f"Invalid redirect target: {current_url!r}")
            ensure_public_url(current_url)
            if before_request is not None:
                before_request(current_url)
            with client.get(
                current_url,
                timeout=timeout,
                headers={"User-Agent": USER_AGENT},
                allow_redirects=False,
                stream=True,
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
                media_type = content_type.split(";", 1)[0].strip().lower()
                if media_type and media_type not in _HTML_CONTENT_TYPES:
                    raise FetchError(f"Response is not HTML (Content-Type: {media_type})")
                body = read_limited_body(response, max_response_bytes)
                return FetchedPage(
                    url=response.url or current_url,
                    html=_decode_html(body, content_type),
                    content_type=content_type,
                )
    except requests.RequestException as exc:
        raise FetchError(f"Failed to fetch {url!r}: {exc}") from exc
    finally:
        if session is None:
            client.close()
