import { describe, expect, it, vi, beforeEach } from "vitest";
import { getActiveTabInfo } from "./tab-detector";

const queryMock = vi.fn();

beforeEach(() => {
  queryMock.mockReset();
  vi.stubGlobal("chrome", { tabs: { query: queryMock } });
});

describe("getActiveTabInfo", () => {
  it("classifies the active tab's URL as youtube", async () => {
    queryMock.mockResolvedValueOnce([
      { url: "https://www.youtube.com/watch?v=abc" },
    ]);

    const result = await getActiveTabInfo();

    expect(queryMock).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(result).toEqual({
      url: "https://www.youtube.com/watch?v=abc",
      sourceType: "youtube",
    });
  });

  it("classifies a non-YouTube URL as article", async () => {
    queryMock.mockResolvedValueOnce([
      { url: "https://example.com/blog/post" },
    ]);

    const result = await getActiveTabInfo();

    expect(result).toEqual({
      url: "https://example.com/blog/post",
      sourceType: "article",
    });
  });

  it("returns null when there is no active tab", async () => {
    queryMock.mockResolvedValueOnce([]);

    expect(await getActiveTabInfo()).toBeNull();
  });

  it("returns null when the active tab has no readable URL", async () => {
    queryMock.mockResolvedValueOnce([{ url: undefined }]);

    expect(await getActiveTabInfo()).toBeNull();
  });
});
