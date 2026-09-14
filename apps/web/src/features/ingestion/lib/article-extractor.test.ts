import { describe, expect, it, vi } from "vitest";
import { ArticleFetchError, fetchArticle } from "./article-extractor";

const URL = "https://example.com/article";

const LONG_PARAGRAPH =
  "This is a sufficiently long paragraph of article body text that readability " +
  "should easily recognize as the main content region of the page, since it " +
  "contains many sentences and enough textual density for Mozilla's Readability " +
  "algorithm to score it highly against surrounding boilerplate elements like " +
  "navigation and footers on the page.";

const ARTICLE_HTML = `<!doctype html>
<html lang="en">
<head><title>My Great Article Title</title></head>
<body>
<nav><a href="/">Home</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
<header><h1>Example Site</h1></header>
<article>
<h1>My Great Article Title</h1>
<p class="byline">By Jane Doe</p>
<p>${LONG_PARAGRAPH}</p>
<p>${LONG_PARAGRAPH} A second paragraph continuing the thought with even more filler text so the total character count comfortably clears the configured minimum content length threshold.</p>
<p>${LONG_PARAGRAPH} And a third paragraph for good measure, further padding out the readable text.</p>
</article>
<aside class="ads"><div>Buy our stuff! Limited time offer, click here now.</div></aside>
<footer>Copyright 2024 Example Site. All rights reserved.</footer>
</body>
</html>`;

// A React/Vue-style shell: the real content only exists after client-side
// JS runs, so the static HTML we fetch has almost nothing in it.
const JS_RENDERED_SHELL_HTML = `<!doctype html>
<html>
<head><title>App</title></head>
<body><div id="root"></div><script src="/static/bundle.js"></script></body>
</html>`;

// A paywall teaser: enough text to look like a real article to the cheap
// `isProbablyReaderable` pre-check, but far short of a full article once
// actually extracted.
const PAYWALL_TEASER_HTML = `<!doctype html>
<html>
<head><title>Paywalled Story</title></head>
<body>
<article>
<h1>Breaking News</h1>
<p>This is the opening teaser paragraph of a paywalled story, long enough to pass the cheap readerable heuristic check but nowhere near a full article once extracted, subscribe to continue reading the rest of this story.</p>
</article>
</body>
</html>`;

function htmlResponse(
  html: string,
  init: { status?: number; contentType?: string; contentLength?: string } = {}
) {
  const headers = new Headers();
  headers.set("content-type", init.contentType ?? "text/html; charset=utf-8");
  if (init.contentLength) headers.set("content-length", init.contentLength);
  return new Response(html, { status: init.status ?? 200, headers });
}

function fakeDelay() {
  return vi.fn().mockResolvedValue(undefined);
}

describe("fetchArticle", () => {
  it("extracts clean article text, discarding nav/ads/footer chrome", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));

    const result = await fetchArticle(URL, { fetch: fetchMock });

    expect(result.title).toContain("My Great Article Title");
    expect(result.text).toContain("sufficiently long paragraph");
    expect(result.text).not.toContain("Buy our stuff");
    expect(result.text).not.toContain("Copyright 2024");
    expect(result.text).not.toContain("Home");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes whitespace in the extracted text", async () => {
    const html = `<!doctype html><html><body><article><h1>T</h1><p>${LONG_PARAGRAPH}\n\n  ${LONG_PARAGRAPH}   </p></article></body></html>`;
    const fetchMock = vi.fn().mockResolvedValueOnce(htmlResponse(html));

    const result = await fetchArticle(URL, { fetch: fetchMock });

    expect(result.text).not.toMatch(/\s{2,}/);
  });

  it("returns null metadata fields gracefully when absent", async () => {
    const html = `<!doctype html><html><body><article><h1>T</h1><p>${LONG_PARAGRAPH} ${LONG_PARAGRAPH}</p></article></body></html>`;
    const fetchMock = vi.fn().mockResolvedValueOnce(htmlResponse(html));

    const result = await fetchArticle(URL, { fetch: fetchMock });

    expect(result.byline).toBeNull();
    expect(result.siteName).toBeNull();
  });

  it("rejects a malformed URL without making a network request", async () => {
    const fetchMock = vi.fn();

    await expect(
      fetchArticle("not a url", { fetch: fetchMock })
    ).rejects.toMatchObject({ reason: "invalid-url" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) protocol without making a network request", async () => {
    const fetchMock = vi.fn();

    await expect(
      fetchArticle("file:///etc/passwd", { fetch: fetchMock })
    ).rejects.toMatchObject({ reason: "invalid-url" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"not-found\" on a 404, without retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("", { status: 404 }));
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay })
    ).rejects.toMatchObject({ reason: "not-found" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"forbidden\" on a 403 (paywall/login signal), without retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("", { status: 403 }));
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay })
    ).rejects.toMatchObject({ reason: "forbidden" });
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"not-html\" for a non-HTML content-type", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse("%PDF-1.4 ...", { contentType: "application/pdf" })
      );
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay })
    ).rejects.toMatchObject({ reason: "not-html" });
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"too-large\" when Content-Length exceeds the cap", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse(ARTICLE_HTML, { contentLength: String(50 * 1024 * 1024) })
      );
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay, maxHtmlBytes: 1024 })
    ).rejects.toMatchObject({ reason: "too-large" });
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"too-large\" when the actual body exceeds the cap (no Content-Length header)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay, maxHtmlBytes: 100 })
    ).rejects.toMatchObject({ reason: "too-large" });
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails cleanly with \"extraction-failed\" for a JS-rendered shell page, not garbled output", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse(JS_RENDERED_SHELL_HTML));
    const delay = fakeDelay();

    const error = await fetchArticle(URL, { fetch: fetchMock, delay }).catch(
      (e) => e
    );

    expect(error).toBeInstanceOf(ArticleFetchError);
    expect(error).toMatchObject({ reason: "extraction-failed" });
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails cleanly with \"extraction-failed\" for a paywall teaser that's too short once extracted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse(PAYWALL_TEASER_HTML));
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay })
    ).rejects.toMatchObject({ reason: "extraction-failed" });
    expect(delay).not.toHaveBeenCalled();
  });

  it("retries with exponential backoff on a 429 (blocked) and recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("", { status: 429 }))
      .mockResolvedValueOnce(htmlResponse("", { status: 429 }))
      .mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));
    const delay = fakeDelay();

    const result = await fetchArticle(URL, {
      fetch: fetchMock,
      delay,
      baseDelayMs: 100,
    });

    expect(result.text).toContain("sufficiently long paragraph");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenNthCalledWith(1, 100);
    expect(delay).toHaveBeenNthCalledWith(2, 200);
  });

  it("retries on a 500 (blocked) and gives up after maxAttempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse("", { status: 500 }));
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay, maxAttempts: 3, baseDelayMs: 10 })
    ).rejects.toMatchObject({ reason: "blocked" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
  });

  it("retries an unrecognized network error as \"unknown\" and eventually fails with that reason", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const delay = fakeDelay();

    await expect(
      fetchArticle(URL, { fetch: fetchMock, delay, maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toMatchObject({ reason: "unknown" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers from a transient network error on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));
    const delay = fakeDelay();

    const result = await fetchArticle(URL, { fetch: fetchMock, delay, baseDelayMs: 10 });

    expect(result.title).toContain("My Great Article Title");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("forwards a custom fetch implementation and uses it exclusively", async () => {
    const customFetch = vi.fn().mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));

    await fetchArticle(URL, { fetch: customFetch });

    expect(customFetch).toHaveBeenCalledTimes(1);
    expect(customFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ redirect: "follow" })
    );
  });
});
