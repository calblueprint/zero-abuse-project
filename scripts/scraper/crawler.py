"""Small, sequential crawler for public article pages on one hostname."""

import math
import re
import time
from collections import deque
from collections.abc import Callable
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import requests

from .fetcher import (
    DEFAULT_MAX_RESPONSE_BYTES,
    DEFAULT_TIMEOUT_SECONDS,
    USER_AGENT,
    FetchError,
    ensure_public_url,
    read_limited_body,
)
from .models import CrawlFailure, CrawlResult
from .scraper import scrape_url


class _AccessError(FetchError):
    """A request prevented by site or crawl rules."""


class _AlreadyVisited(Exception):
    """A redirect led to a URL already requested by this crawl."""


MAX_ROBOTS_BYTES = 1024 * 1024


def normalize_url(url: str, base_url: str | None = None) -> str:
    """Resolve a link, normalize its host and port, and remove its fragment."""
    if not isinstance(url, str) or not url.strip():
        raise ValueError("URL must be a non-empty string")
    parsed = urlsplit(urljoin(base_url, url.strip()) if base_url else url.strip())
    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Expected an absolute HTTP(S) URL")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("URLs containing credentials are not supported")
    if any(char.isspace() for char in parsed.netloc):
        raise ValueError("URL hostname contains whitespace")
    netloc = parsed.netloc.lower()
    if parsed.port == {"http": 80, "https": 443}[scheme]:
        netloc = netloc.rsplit(":", 1)[0]
    normalized = urlunsplit((scheme, netloc, parsed.path or "/", parsed.query, ""))
    # Robots checks must use the same normalized path Requests will send.
    try:
        return requests.Request("GET", normalized).prepare().url
    except requests.RequestException as exc:
        raise ValueError(f"Invalid URL: {exc}") from exc


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def discover_links(html: str, page_url: str) -> list[str]:
    """Return unique HTTP(S) anchor links resolved against the final page URL."""
    parser = _LinkParser()
    parser.feed(html)
    links = []
    seen = set()
    for href in parser.links:
        try:
            link = normalize_url(href, page_url)
        except (ValueError, UnicodeError):
            continue
        if link not in seen:
            seen.add(link)
            links.append(link)
    return links


def is_article_url(url: str) -> bool:
    """Conservative default filter; callers can supply source-specific rules."""
    path = urlsplit(url).path.lower()
    segments = [segment for segment in path.split("/") if segment]
    if not segments:
        return False
    if path.endswith(
        (
            ".pdf",
            ".zip",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".svg",
            ".webp",
            ".mp3",
            ".mp4",
            ".xml",
            ".json",
            ".css",
            ".js",
        )
    ):
        return False
    excluded = {
        "tag", "tags", "category", "categories", "author", "authors",
        "search", "login", "signin", "account", "page", "archive", "archives",
    }
    if excluded.intersection(segments):
        return False
    sections = {
        "blog", "blogs", "news", "article", "articles", "post", "posts",
        "report", "reports", "press", "weblog",
    }
    return any(part in sections for part in segments[:-1]) or bool(
        re.search(r"/(?:19|20)\d{2}/\d{1,2}/", path)
    )


class _CrawlRules:
    """Cache robots rules and space requests apart, including redirects."""

    def __init__(self, host: str, session: requests.Session, timeout: float, delay: float):
        self.host = host
        self.session = session
        self.timeout = timeout
        self.delay = delay
        self.last_request: float | None = None
        self.robots: dict[str, RobotFileParser] = {}
        self.requested: set[str] = set()

    def _wait(self, delay: float) -> None:
        if self.last_request is not None:
            time.sleep(max(0, delay - (time.monotonic() - self.last_request)))
        self.last_request = time.monotonic()

    def _load_robots(self, origin: str) -> RobotFileParser:
        url = origin + "/robots.txt"
        parser = RobotFileParser(url)
        for _ in range(6):
            if urlsplit(url).hostname != self.host:
                raise _AccessError("robots.txt redirected outside the seed hostname")
            try:
                ensure_public_url(url)
                self._wait(self.delay)
                with self.session.get(
                    url,
                    timeout=self.timeout,
                    headers={"User-Agent": USER_AGENT},
                    allow_redirects=False,
                    stream=True,
                ) as response:
                    status = response.status_code
                    if status in {301, 302, 303, 307, 308}:
                        location = response.headers.get("Location")
                        if not location:
                            raise _AccessError("robots.txt redirect has no target")
                        url = normalize_url(location, url)
                        continue
                    if status in {401, 403}:
                        parser.disallow_all = True
                    elif status == 429:
                        raise _AccessError("robots.txt returned HTTP 429 (rate limited)")
                    elif 400 <= status < 500:
                        parser.allow_all = True
                    else:
                        response.raise_for_status()
                        body = read_limited_body(response, MAX_ROBOTS_BYTES)
                        parser.parse(body.decode("utf-8", errors="replace").splitlines())
                    return parser
            except (FetchError, requests.RequestException, ValueError) as exc:
                raise _AccessError(f"Could not read robots.txt: {exc}") from exc
        raise _AccessError("Too many redirects while reading robots.txt")

    def before_request(self, url: str) -> None:
        try:
            url = normalize_url(url)
        except (ValueError, UnicodeError) as exc:
            raise _AccessError(f"Invalid URL: {exc}") from exc
        if url in self.requested:
            raise _AlreadyVisited()
        parsed = urlsplit(url)
        if parsed.hostname != self.host:
            raise _AccessError("URL or redirect is outside the seed hostname")
        origin = urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))
        if origin not in self.robots:
            self.robots[origin] = self._load_robots(origin)
        rules = self.robots[origin]
        if not rules.can_fetch(USER_AGENT, url):
            raise _AccessError("Blocked by robots.txt")
        delay = rules.crawl_delay(USER_AGENT) or 0
        self._wait(max(self.delay, delay))
        self.requested.add(url)


def crawl_site(
    start_url: str,
    *,
    max_pages: int = 20,
    max_depth: int = 1,
    request_delay: float = 1.0,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    max_response_bytes: int = DEFAULT_MAX_RESPONSE_BYTES,
    link_filter: Callable[[str], bool] | None = None,
    session: requests.Session | None = None,
) -> CrawlResult:
    """Crawl matching article links on the seed hostname in breadth-first order.

    The seed is always attempted at depth zero. ``max_pages`` counts attempted
    queued pages (including failures), excluding robots and redirect requests.
    Access/fetch/extraction errors are recorded without aborting other pages.
    """
    seed = normalize_url(start_url)
    if isinstance(max_pages, bool) or not isinstance(max_pages, int) or max_pages < 1:
        raise ValueError("max_pages must be a positive integer")
    if isinstance(max_depth, bool) or not isinstance(max_depth, int) or max_depth < 0:
        raise ValueError("max_depth must be a non-negative integer")
    if not math.isfinite(request_delay) or request_delay < 0:
        raise ValueError("request_delay must be finite and non-negative")
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError("timeout must be finite and greater than zero")
    if (
        isinstance(max_response_bytes, bool)
        or not isinstance(max_response_bytes, int)
        or max_response_bytes < 1
    ):
        raise ValueError("max_response_bytes must be a positive integer")

    host = urlsplit(seed).hostname
    assert host is not None
    client = session or requests.Session()
    rules = _CrawlRules(host, client, timeout, request_delay)
    filter_link = is_article_url if link_filter is None else link_filter
    queue = deque([(seed, 0)])
    queued = {seed}
    result = CrawlResult(seed_url=seed)

    try:
        while queue and len(result.visited_urls) < max_pages:
            url, depth = queue.popleft()
            if url in rules.requested:
                continue
            result.visited_urls.append(url)
            try:
                scraped = scrape_url(
                    url,
                    timeout=timeout,
                    session=client,
                    before_request=rules.before_request,
                    max_response_bytes=max_response_bytes,
                )
            except _AlreadyVisited:
                continue
            except FetchError as exc:
                stage = "access" if isinstance(exc, _AccessError) else "fetch"
                result.failures.append(CrawlFailure(url, stage, str(exc)))
                continue
            final_url = normalize_url(scraped.url)
            if scraped.page is not None:
                result.pages.append(scraped.page)
            else:
                result.failures.append(CrawlFailure(
                    final_url, "extract", scraped.extraction_error or "No extractable content",
                ))
            if depth >= max_depth:
                continue
            for link in discover_links(scraped.html, final_url):
                if urlsplit(link).hostname != host or link in queued or link in rules.requested:
                    continue
                if filter_link(link):
                    queued.add(link)
                    queue.append((link, depth + 1))
    finally:
        if session is None:
            client.close()
    return result
