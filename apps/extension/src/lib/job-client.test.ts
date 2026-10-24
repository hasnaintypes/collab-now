import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateNotes, getJobStatus } from "./job-client";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("generateNotes", () => {
  it("posts the token and source URL, never a cookie", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { jobId: "job-1" } }),
    });

    const result = await generateNotes("secret-token", "https://example.com/article");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/extension/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "x-api-key": "secret-token", "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: "https://example.com/article" }),
      })
    );
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.credentials).toBeUndefined();
    expect(result).toEqual({ success: true, data: { jobId: "job-1" } });
  });

  it("surfaces a business failure (e.g. rate limited) as success: false", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: "You're submitting content too quickly. Try again in 1 minute.",
        retryAfterSeconds: 60,
      }),
    });

    const result = await generateNotes("secret-token", "https://example.com");

    expect(result).toEqual({
      success: false,
      error: "You're submitting content too quickly. Try again in 1 minute.",
      retryAfterSeconds: 60,
    });
  });

  it("surfaces upgradeRequired (P3-5 Flow D) so the popup can offer an upgrade link", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error:
          "This workspace has used all 5 notes included in its plan this month. Upgrade to generate more.",
        upgradeRequired: true,
      }),
    });

    const result = await generateNotes("secret-token", "https://example.com");

    expect(result).toEqual({
      success: false,
      error:
        "This workspace has used all 5 notes included in its plan this month. Upgrade to generate more.",
      upgradeRequired: true,
    });
  });

  it("normalizes a non-200 (e.g. invalid token) into success: false", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid or expired personal access token." }),
    });

    const result = await generateNotes("bad-token", "https://example.com");

    expect(result).toEqual({
      success: false,
      error: "Invalid or expired personal access token.",
    });
  });

  it("returns a friendly error instead of throwing on a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const result = await generateNotes("secret-token", "https://example.com");

    expect(result.success).toBe(false);
  });
});

describe("getJobStatus", () => {
  it("sends the token as x-api-key against the job's URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: "job-1",
          status: "ready",
          sourceType: "article",
          sourceUrl: "https://example.com",
          errorMessage: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          roomId: "room-1",
        },
      }),
    });

    const result = await getJobStatus("secret-token", "job-1");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/extension/jobs/job-1"),
      expect.objectContaining({
        method: "GET",
        headers: { "x-api-key": "secret-token" },
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roomId).toBe("room-1");
    }
  });

  it("returns a friendly error instead of throwing on a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const result = await getJobStatus("secret-token", "job-1");

    expect(result).toEqual({
      success: false,
      error: "Couldn't reach CollabNow. Check your connection and try again.",
    });
  });
});
