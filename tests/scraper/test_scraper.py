"""Verify scraping, traversal, access rules, and failures offline."""

import json
import socket
import unittest
from unittest.mock import patch

import requests

from scripts.models import Article
from scripts.scraper.crawler import crawl_site, discover_links, is_article_url, normalize_url
from scripts.scraper.extractor import ExtractionError, extract_page
from scripts.scraper.fetcher import FetchError, UnsafeUrlError, fetch_page_result, is_valid_url
from scripts.scraper.scraper import scrape_url

ROOT = "https://site.test"


def public_dns(_hostname, port, **_kwargs):
    """Resolve fixture hostnames to a public address without using the network."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]


def article(title="Fixture article", links=()):
    body = "This public report explains the evidence and findings in detail. " * 12
    anchors = "".join(f'<a href="{url}">Read more</a>' for url in links)
    return (
        f"<html><head><title>{title}</title></head><body><nav>Home Contact</nav>"
        f"<article><h1>{title}</h1><p>{body}</p>{anchors}</article>"
        "<footer>Copyright</footer></body></html>"
    )


class FixtureSession:
    """Requests-compatible fixture client; unexpected network requests fail."""

    def __init__(self, pages, robots="User-agent: *\nAllow: /\n"):
        self.pages = {ROOT + "/robots.txt": robots, **pages}
        self.calls = []
        self.closed = False

    def close(self):
        self.closed = True

    def get(self, url, **kwargs):
        self.calls.append(url)
        if kwargs.get("allow_redirects") is not False:
            raise AssertionError("Redirects must be inspected before being followed")
        if kwargs.get("stream") is not True:
            raise AssertionError("Responses must be streamed so size limits can be enforced")
        value = self.pages[url]
        if isinstance(value, Exception):
            raise value
        status, headers, text = value if isinstance(value, tuple) else (
            200, {"Content-Type": "text/html"}, value,
        )
        response = requests.Response()
        response.status_code = status
        response.headers.update(headers)
        response.url = url
        response.encoding = requests.utils.get_encoding_from_headers(response.headers)
        response._content = text.encode("utf-8")
        response._content_consumed = True
        return response


class PublicNetworkTestCase(unittest.TestCase):
    """Provide deterministic public DNS for offline request tests."""

    def setUp(self):
        super().setUp()
        resolver = patch("scripts.scraper.fetcher.socket.getaddrinfo", side_effect=public_dns)
        resolver.start()
        self.addCleanup(resolver.stop)


class CrawlerTests(PublicNetworkTestCase):
    def crawl(self, pages, **options):
        session = FixtureSession(pages, options.pop("robots", "User-agent: *\nAllow: /\n"))
        result = crawl_site(ROOT + "/blog", session=session, request_delay=0, **options)
        return result, session

    def test_breadth_first_page_budget_and_duplicate_links(self):
        pages = {
            ROOT + "/blog": article(
                links=[
                    "/blog/a#heading",
                    "/blog/b",
                    "/blog/a",
                    "https://other.test/blog/x",
                    "/login",
                    "/blog/file.pdf",
                ]
            ),
            ROOT + "/blog/a": article(links=["/blog/c", "/blog/b"]),
            ROOT + "/blog/b": article(links=["/blog/d"]),
            ROOT + "/blog/c": article(links=["/blog/e"]),
        }
        result, session = self.crawl(pages, max_pages=4, max_depth=2)
        expected = [ROOT + path for path in ["/blog", "/blog/a", "/blog/b", "/blog/c"]]
        self.assertEqual(result.visited_urls, expected)
        self.assertEqual([str(page.url) for page in result.pages], expected)
        self.assertEqual(session.calls, [ROOT + "/robots.txt", *expected])
        self.assertFalse(result.failures)
        self.assertNotIn("Copyright", result.pages[0].article_text)

    def test_depth_limit_and_custom_link_filter(self):
        pages = {
            ROOT + "/blog": article(links=["/features/story"]),
            ROOT + "/features/story": article(links=["/features/deeper"]),
        }
        result, _ = self.crawl(pages, max_depth=1, link_filter=lambda url: "/features/" in url)
        self.assertEqual(len(result.pages), 2)
        result, _ = self.crawl(pages, max_depth=0)
        self.assertEqual(len(result.visited_urls), 1)

    def test_each_page_is_scraped_through_scrape_url(self):
        pages = {
            ROOT + "/blog": article(links=["/blog/story"]),
            ROOT + "/blog/story": article(),
        }
        with patch("scripts.scraper.crawler.scrape_url", wraps=scrape_url) as scrape:
            result, _ = self.crawl(pages)
        self.assertEqual([call.args[0] for call in scrape.call_args_list], result.visited_urls)
        self.assertEqual(len(result.pages), 2)

    def test_fetch_failure_counts_towards_budget_and_does_not_stop_crawl(self):
        pages = {
            ROOT + "/blog": article(links=["/blog/broken", "/blog/good"]),
            ROOT + "/blog/broken": requests.ConnectionError("fixture failure"),
            ROOT + "/blog/good": article(),
        }
        result, _ = self.crawl(pages, max_pages=3)
        self.assertEqual(len(result.pages), 2)
        self.assertEqual(result.failures[0].stage, "fetch")
        self.assertEqual(len(result.visited_urls), 3)

    def test_links_followed_even_when_seed_has_no_extractable_content(self):
        result, _ = self.crawl({
            ROOT + "/blog": '<html><body><nav><a href="/blog/story">Menu</a></nav></body></html>',
            ROOT + "/blog/story": article(),
        })
        self.assertEqual(result.failures[0].stage, "extract")
        self.assertEqual([str(page.url) for page in result.pages], [ROOT + "/blog/story"])

    def test_robots_disallow_prevents_request_and_other_pages_continue(self):
        result, session = self.crawl({
            ROOT + "/blog": article(links=["/blog/private", "/blog/public"]),
            ROOT + "/blog/public": article(),
        }, robots="User-agent: *\nDisallow: /blog/private\n")
        self.assertNotIn(ROOT + "/blog/private", session.calls)
        self.assertEqual(result.failures[0].stage, "access")
        self.assertEqual(len(result.pages), 2)

    def test_robots_unavailable_fails_closed(self):
        session = FixtureSession({}, robots=(503, {}, "Unavailable"))
        result = crawl_site(ROOT + "/blog", session=session, request_delay=0)
        self.assertEqual(session.calls, [ROOT + "/robots.txt"])
        self.assertEqual(result.failures[0].stage, "access")

    def test_missing_robots_allows_crawl_and_rate_limit_blocks_it(self):
        for status, allowed in [(404, True), (429, False)]:
            with self.subTest(status=status):
                result, session = self.crawl(
                    {ROOT + "/blog": article()}, robots=(status, {}, ""),
                )
                self.assertEqual(bool(result.pages), allowed)
                self.assertEqual(ROOT + "/blog" in session.calls, allowed)

    def test_redirect_final_url_is_used_for_relative_links(self):
        result, session = self.crawl({
            ROOT + "/blog": (302, {"Location": "/blog/"}, ""),
            ROOT + "/blog/": article(links=["story"]),
            ROOT + "/blog/story": article(),
        })
        self.assertEqual(str(result.pages[0].url), ROOT + "/blog/")
        self.assertEqual(str(result.pages[1].url), ROOT + "/blog/story")
        self.assertEqual(session.calls.count(ROOT + "/robots.txt"), 1)

    def test_redirect_cannot_cross_hostname_or_bypass_robots(self):
        for location in ["https://other.test/blog/story", "/private", ROOT + "/blog/../private"]:
            with self.subTest(location=location):
                result, session = self.crawl({
                    ROOT + "/blog": (302, {"Location": location}, ""),
                }, robots="User-agent: *\nDisallow: /private\n")
                self.assertEqual(result.failures[0].stage, "access")
                self.assertEqual(session.calls, [ROOT + "/robots.txt", ROOT + "/blog"])

    def test_redirect_to_queued_page_is_not_fetched_twice(self):
        result, session = self.crawl({
            ROOT + "/blog": article(links=["/blog/alias", "/blog/story"]),
            ROOT + "/blog/alias": (301, {"Location": "/blog/story"}, ""),
            ROOT + "/blog/story": article(),
        })
        self.assertEqual(session.calls.count(ROOT + "/blog/story"), 1)
        self.assertEqual(len(result.pages), 2)

    def test_crawl_delay_is_honored(self):
        session = FixtureSession(
            {ROOT + "/blog": article()},
            robots="User-agent: *\nCrawl-delay: 2\n",
        )
        with patch("scripts.scraper.crawler.time.sleep") as sleep:
            crawl_site(ROOT + "/blog", session=session, request_delay=0)
        self.assertTrue(any(call.args[0] > 1 for call in sleep.call_args_list))

    def test_non_html_content_is_recorded_as_failure(self):
        result, _ = self.crawl({
            ROOT + "/blog": (200, {"Content-Type": "application/pdf"}, "not HTML"),
        })
        self.assertEqual(result.failures[0].stage, "fetch")
        self.assertFalse(result.pages)

    def test_invalid_limits_and_urls(self):
        for kwargs in [
            {"max_pages": 0},
            {"max_depth": -1},
            {"request_delay": float("nan")},
            {"timeout": 0},
            {"max_response_bytes": 0},
        ]:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                crawl_site(ROOT, **kwargs)
        with self.assertRaises(ValueError):
            crawl_site("not-a-url")


class LinkAndFetcherTests(PublicNetworkTestCase):
    def test_normalization_and_link_discovery(self):
        self.assertEqual(
            normalize_url("HTTPS://Site.Test:443/blog?a=1#section"),
            ROOT + "/blog?a=1",
        )
        html = '<a href="story#part">A</a><a href="story">B</a><a href="mailto:a@b.test">Mail</a>'
        self.assertEqual(discover_links(html, ROOT + "/blog/"), [ROOT + "/blog/story"])
        self.assertTrue(is_article_url(ROOT + "/news/story"))
        self.assertTrue(is_article_url(ROOT + "/2025/10/story"))
        self.assertFalse(is_article_url(ROOT + "/news/tags/topic"))
        self.assertFalse(is_article_url(ROOT + "/news/file.pdf"))
        self.assertFalse(is_article_url(ROOT + "/about"))
        self.assertFalse(is_article_url(ROOT + "/contact"))

    def test_encoding_detection(self):
        session = FixtureSession({ROOT + "/story": "<html><body>Unicode: café …</body></html>"})
        self.assertIn("café …", fetch_page_result(ROOT + "/story", session=session).html)

    def test_fetcher_closes_owned_session_only(self):
        session = FixtureSession({ROOT + "/story": article()})
        fetch_page_result(ROOT + "/story", session=session)
        self.assertFalse(session.closed)
        with patch("scripts.scraper.fetcher.requests.Session", return_value=session):
            fetch_page_result(ROOT + "/story")
        self.assertTrue(session.closed)

    def test_redirect_limit_is_a_fetch_error(self):
        session = FixtureSession({ROOT + "/loop": (302, {"Location": "/loop"}, "")})
        with self.assertRaises(FetchError):
            fetch_page_result(ROOT + "/loop", session=session, max_redirects=1)

    def test_private_and_credentialed_urls_are_rejected(self):
        self.assertFalse(is_valid_url("https://user:secret@site.test/story"))
        for url in [
            "http://127.0.0.1/admin",
            "http://169.254.169.254/latest/meta-data",
            "http://[::1]/admin",
            "http://localhost/admin",
        ]:
            with self.subTest(url=url), self.assertRaises(UnsafeUrlError):
                fetch_page_result(url, session=FixtureSession({}))

    def test_hostname_resolving_to_private_address_is_rejected_before_request(self):
        session = FixtureSession({ROOT + "/story": article()})
        private_dns = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.2", 443))]
        with patch("scripts.scraper.fetcher.socket.getaddrinfo", return_value=private_dns):
            with self.assertRaises(UnsafeUrlError):
                fetch_page_result(ROOT + "/story", session=session)
        self.assertFalse(session.calls)

    def test_redirect_to_private_address_is_rejected_before_request(self):
        session = FixtureSession({
            ROOT + "/story": (302, {"Location": "http://127.0.0.1/admin"}, ""),
        })
        with self.assertRaises(UnsafeUrlError):
            fetch_page_result(ROOT + "/story", session=session)
        self.assertEqual(session.calls, [ROOT + "/story"])

    def test_response_size_limit_uses_header_and_streamed_bytes(self):
        declared = FixtureSession({
            ROOT + "/declared": (
                200,
                {"Content-Type": "text/html", "Content-Length": "100"},
                "short",
            ),
        })
        with self.assertRaises(FetchError):
            fetch_page_result(ROOT + "/declared", session=declared, max_response_bytes=10)

        streamed = FixtureSession({ROOT + "/streamed": "<html>too large</html>"})
        with self.assertRaises(FetchError):
            fetch_page_result(ROOT + "/streamed", session=streamed, max_response_bytes=10)


class ScraperTests(PublicNetworkTestCase):
    def test_success_returns_html_content_and_final_url(self):
        html = article("Final article")
        session = FixtureSession({
            ROOT + "/old": (302, {"Location": "/story"}, ""),
            ROOT + "/story": html,
        })
        checked = []
        result = scrape_url(ROOT + "/old", session=session, before_request=checked.append)
        self.assertEqual(checked, [ROOT + "/old", ROOT + "/story"])
        self.assertEqual(result.url, ROOT + "/story")
        self.assertEqual(result.html, html)
        self.assertEqual(str(result.page.url), result.url)
        self.assertEqual(result.page.title, "Final article")
        self.assertIsNone(result.extraction_error)

    def test_extraction_failure_preserves_html_for_links(self):
        html = '<html><body><nav><a href="/blog/story">Menu</a></nav></body></html>'
        session = FixtureSession({ROOT + "/blog": html})
        result = scrape_url(ROOT + "/blog", session=session)
        self.assertEqual(result.html, html)
        self.assertIsNone(result.page)
        self.assertTrue(result.extraction_error)
        self.assertEqual(discover_links(result.html, result.url), [ROOT + "/blog/story"])

    def test_request_and_non_html_failures_raise_fetch_error(self):
        responses = [
            requests.ConnectionError("fixture failure"),
            (200, {"Content-Type": "application/pdf"}, "PDF"),
        ]
        for response in responses:
            with self.subTest(response=response), self.assertRaises(FetchError):
                scrape_url(ROOT + "/story", session=FixtureSession({ROOT + "/story": response}))


class ArticleContractTests(unittest.TestCase):
    def test_extractor_returns_shared_article_contract(self):
        extracted = json.dumps({
            "text": "Original article text.",
            "title": "Article title",
            "author": "Example Author",
            "date": "2025-10-03T12:30:00Z",
            "sitename": "Example Publisher",
        })
        with patch(
            "scripts.scraper.extractor.trafilatura.extract",
            return_value=extracted,
        ) as extract:
            result = extract_page("<html>fixture</html>", ROOT + "/news/story")

        self.assertIsInstance(result, Article)
        self.assertEqual(result.article_text, "Original article text.")
        self.assertEqual(result.source, "Example Publisher")
        self.assertEqual(result.published_at.isoformat(), "2025-10-03T12:30:00+00:00")
        self.assertEqual(extract.call_count, 1)
        self.assertTrue(extract.call_args.kwargs["fast"])

    def test_substantial_fallback_article_is_accepted(self):
        fallback = json.dumps({
            "text": "Substantial article evidence " * 50,
            "title": "Fallback article",
        })
        with patch(
            "scripts.scraper.extractor.trafilatura.extract",
            side_effect=[None, fallback],
        ) as extract:
            result = extract_page("<html>fixture</html>", ROOT + "/news/story")

        self.assertEqual(result.title, "Fallback article")
        self.assertEqual([call.kwargs["fast"] for call in extract.call_args_list], [True, False])

    def test_short_fallback_navigation_is_rejected(self):
        fallback = json.dumps({"text": "Home About Contact News"})
        with patch(
            "scripts.scraper.extractor.trafilatura.extract",
            side_effect=[None, fallback],
        ):
            with self.assertRaisesRegex(ExtractionError, "No meaningful main content"):
                extract_page("<html>fixture</html>", ROOT + "/news/story")

    def test_invalid_fallback_metadata_fails_safely(self):
        with patch(
            "scripts.scraper.extractor.trafilatura.extract",
            side_effect=[None, "not-json"],
        ):
            with self.assertRaisesRegex(ExtractionError, "invalid metadata"):
                extract_page("<html>fixture</html>", ROOT + "/news/story")

    def test_unparseable_date_does_not_discard_valid_article(self):
        extracted = json.dumps({"text": "Useful article text.", "date": "not-a-date"})
        with patch("scripts.scraper.extractor.trafilatura.extract", return_value=extracted):
            result = extract_page("<html>fixture</html>", ROOT + "/news/story")
        self.assertIsNone(result.published_at)


if __name__ == "__main__":
    unittest.main()
