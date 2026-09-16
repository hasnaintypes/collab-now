import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the third-party `youtube-transcript` package rather than hitting the
// network — `fetchTranscriptMock` stands in for its `fetchTranscript` export,
// and the error classes are re-exported as-is (they're just `Error`
// subclasses, so `instanceof` checks in the module under test still work
// against them).
const { fetchTranscriptMock } = vi.hoisted(() => ({
  fetchTranscriptMock: vi.fn(),
}));

vi.mock("youtube-transcript", async () => {
  const actual = await vi.importActual<typeof import("youtube-transcript")>(
    "youtube-transcript"
  );
  return {
    ...actual,
    fetchTranscript: fetchTranscriptMock,
  };
});

import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import {
  fetchYoutubeTranscript,
  TranscriptFetchError,
} from "./youtube-transcript";

const URL = "https://www.youtube.com/watch?v=abc12345678";

// Real `delay` would actually wait; tests inject a no-op stand-in and assert
// on how it was called (attempt count, backoff schedule) instead.
function fakeDelay() {
  return vi.fn().mockResolvedValue(undefined);
}

beforeEach(() => {
  fetchTranscriptMock.mockReset();
});

describe("fetchYoutubeTranscript", () => {
  it("joins caption segments into plain text and reports the detected language", async () => {
    fetchTranscriptMock.mockResolvedValueOnce([
      { text: "Hello", duration: 1, offset: 0, lang: "en" },
      { text: "world.", duration: 1, offset: 1, lang: "en" },
    ]);

    const result = await fetchYoutubeTranscript(URL);

    expect(result).toEqual({
      text: "Hello world.",
      language: "en",
      durationSeconds: 2,
    });
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(1);
    expect(fetchTranscriptMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({})
    );
  });

  it("normalizes whitespace across joined segments", async () => {
    fetchTranscriptMock.mockResolvedValueOnce([
      { text: "  Hello  ", duration: 1, offset: 0, lang: "en" },
      { text: "world  ", duration: 1, offset: 1, lang: "en" },
    ]);

    const result = await fetchYoutubeTranscript(URL);

    expect(result.text).toBe("Hello world");
  });

  it("defaults language to \"unknown\" if the library omits it", async () => {
    fetchTranscriptMock.mockResolvedValueOnce([
      { text: "Hi", duration: 1, offset: 0 },
    ]);

    const result = await fetchYoutubeTranscript(URL);

    expect(result.language).toBe("unknown");
  });

  it("fails fast (no retry) with reason \"no-captions\" when captions are disabled", async () => {
    fetchTranscriptMock.mockRejectedValueOnce(
      new YoutubeTranscriptDisabledError("abc12345678")
    );
    const delay = fakeDelay();

    await expect(fetchYoutubeTranscript(URL, { delay })).rejects.toMatchObject(
      { reason: "no-captions" }
    );
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"no-captions\" when no transcripts are available at all", async () => {
    fetchTranscriptMock.mockRejectedValueOnce(
      new YoutubeTranscriptNotAvailableError("abc12345678")
    );

    const error = await fetchYoutubeTranscript(URL).catch((e) => e);

    expect(error).toBeInstanceOf(TranscriptFetchError);
    expect(error).toMatchObject({ reason: "no-captions" });
  });

  it("treats an empty segment list the same as \"no-captions\" defensively", async () => {
    fetchTranscriptMock.mockResolvedValueOnce([]);
    const delay = fakeDelay();

    await expect(fetchYoutubeTranscript(URL, { delay })).rejects.toMatchObject(
      { reason: "no-captions" }
    );
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"video-unavailable\" without retrying", async () => {
    fetchTranscriptMock.mockRejectedValueOnce(
      new YoutubeTranscriptVideoUnavailableError("abc12345678")
    );
    const delay = fakeDelay();

    await expect(fetchYoutubeTranscript(URL, { delay })).rejects.toMatchObject(
      { reason: "video-unavailable" }
    );
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it("fails fast with reason \"invalid-url\" for a malformed input, without retrying", async () => {
    fetchTranscriptMock.mockRejectedValueOnce(
      new YoutubeTranscriptError("Impossible to retrieve Youtube video ID.")
    );
    const delay = fakeDelay();

    await expect(
      fetchYoutubeTranscript("not-a-url", { delay })
    ).rejects.toMatchObject({ reason: "invalid-url" });
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it("retries with exponential backoff on \"blocked\" (rate-limit/CAPTCHA) and recovers", async () => {
    fetchTranscriptMock
      .mockRejectedValueOnce(new YoutubeTranscriptTooManyRequestError())
      .mockRejectedValueOnce(new YoutubeTranscriptTooManyRequestError())
      .mockResolvedValueOnce([
        { text: "Recovered", duration: 1, offset: 0, lang: "en" },
      ]);
    const delay = fakeDelay();

    const result = await fetchYoutubeTranscript(URL, {
      delay,
      baseDelayMs: 100,
    });

    expect(result).toEqual({
      text: "Recovered",
      language: "en",
      durationSeconds: 1,
    });
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(3);
    // Exponential backoff: 100 * 2^0, then 100 * 2^1.
    expect(delay).toHaveBeenNthCalledWith(1, 100);
    expect(delay).toHaveBeenNthCalledWith(2, 200);
  });

  it("gives up after maxAttempts and surfaces reason \"blocked\"", async () => {
    fetchTranscriptMock.mockRejectedValue(
      new YoutubeTranscriptTooManyRequestError()
    );
    const delay = fakeDelay();

    await expect(
      fetchYoutubeTranscript(URL, { delay, maxAttempts: 3, baseDelayMs: 10 })
    ).rejects.toMatchObject({ reason: "blocked" });
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(3);
    // Only 2 delays between 3 attempts, not one after the final failure.
    expect(delay).toHaveBeenCalledTimes(2);
  });

  it("retries an unrecognized/network-style error as \"unknown\" and eventually fails with that reason", async () => {
    fetchTranscriptMock.mockRejectedValue(new TypeError("fetch failed"));
    const delay = fakeDelay();

    await expect(
      fetchYoutubeTranscript(URL, { delay, maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toMatchObject({ reason: "unknown" });
    expect(fetchTranscriptMock).toHaveBeenCalledTimes(2);
  });

  it("estimates duration in seconds when segment timings are already in seconds (classic format)", async () => {
    fetchTranscriptMock.mockResolvedValueOnce([
      { text: "Hello", duration: 2, offset: 0, lang: "en" },
      { text: "world.", duration: 2, offset: 118, lang: "en" },
    ]);

    const result = await fetchYoutubeTranscript(URL);

    expect(result.durationSeconds).toBe(120);
  });

  it("normalizes duration to seconds when segment timings are in milliseconds (srv3 format)", async () => {
    fetchTranscriptMock.mockResolvedValueOnce([
      { text: "Hello", duration: 2000, offset: 0, lang: "en" },
      { text: "world.", duration: 2000, offset: 118000, lang: "en" },
    ]);

    const result = await fetchYoutubeTranscript(URL);

    expect(result.durationSeconds).toBe(120);
  });

  it("forwards a custom fetch implementation through to the underlying library", async () => {
    const customFetch = vi.fn();
    fetchTranscriptMock.mockResolvedValueOnce([
      { text: "ok", duration: 1, offset: 0, lang: "en" },
    ]);

    await fetchYoutubeTranscript(URL, { fetch: customFetch });

    expect(fetchTranscriptMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ fetch: customFetch })
    );
  });
});
