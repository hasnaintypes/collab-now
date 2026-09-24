import { describe, expect, it, vi, beforeEach } from "vitest";
import { verifyToken } from "./auth-client";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("verifyToken", () => {
  it("sends the token as x-api-key, never as a cookie", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "user-1", name: "Ada", email: "ada@example.com" },
      }),
    });

    const result = await verifyToken("secret-token");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/extension/me"),
      expect.objectContaining({
        method: "GET",
        headers: { "x-api-key": "secret-token" },
      })
    );
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.credentials).toBeUndefined();
    expect(result).toEqual({
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("returns null for an invalid/expired token (non-OK response)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid or expired personal access token." }),
    });

    const result = await verifyToken("bad-token");

    expect(result).toBeNull();
  });

  it("returns null instead of throwing on a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const result = await verifyToken("any-token");

    expect(result).toBeNull();
  });
});
