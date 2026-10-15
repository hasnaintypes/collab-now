import { describe, expect, it, vi, beforeEach } from "vitest";
import { APIError } from "better-auth/api";

// `token.actions.ts` is a thin wrapper around Better Auth's `apiKey()`
// plugin (`auth.api.createApiKey`/`listApiKeys`/`deleteApiKey`) rather than
// a hand-rolled token table, so these tests mock `auth.api.*` directly
// instead of `@collabnow/db` the way most other `*.actions.test.ts` files
// do — there's no SQL in this module to intercept.
const {
  getSessionMock,
  listApiKeysMock,
  createApiKeyMock,
  deleteApiKeyMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  listApiKeysMock: vi.fn(),
  createApiKeyMock: vi.fn(),
  deleteApiKeyMock: vi.fn(),
}));

vi.mock("@/features/auth/lib", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
      listApiKeys: listApiKeysMock,
      createApiKey: createApiKeyMock,
      deleteApiKey: deleteApiKeyMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const { checkRateLimitMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  formatRetryAfter: (seconds: number) => `${seconds} seconds`,
  RATE_LIMITS: {
    tokenCreate: { name: "token-create", limit: 10, windowMs: 60 * 60 * 1000 },
  },
}));

const {
  listPersonalAccessTokens,
  createPersonalAccessToken,
  revokePersonalAccessToken,
} = await import("./token.actions");

beforeEach(() => {
  getSessionMock.mockReset();
  listApiKeysMock.mockReset();
  createApiKeyMock.mockReset();
  deleteApiKeyMock.mockReset();
  checkRateLimitMock
    .mockReset()
    .mockResolvedValue({ success: true, limit: 10, remaining: 9 });
});

function apiKeyRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "key-1",
    name: "My laptop",
    start: "abcd",
    enabled: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    lastRequest: null,
    expiresAt: null,
    ...overrides,
  };
}

describe("listPersonalAccessTokens", () => {
  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await listPersonalAccessTokens();

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to view your personal access tokens.",
    });
    expect(listApiKeysMock).not.toHaveBeenCalled();
  });

  it("returns tokens newest first, without ever including the hashed key", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listApiKeysMock.mockResolvedValueOnce({
      apiKeys: [
        apiKeyRow({ id: "older", createdAt: new Date("2024-01-01T00:00:00.000Z") }),
        apiKeyRow({ id: "newer", createdAt: new Date("2024-06-01T00:00:00.000Z") }),
      ],
      total: 2,
      limit: undefined,
      offset: undefined,
    });

    const result = await listPersonalAccessTokens();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((t) => t.id)).toEqual(["newer", "older"]);
      expect(result.data[0]).not.toHaveProperty("key");
    }
  });
});

describe("createPersonalAccessToken", () => {
  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createPersonalAccessToken({ name: "My laptop" });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to create a personal access token.",
    });
    expect(createApiKeyMock).not.toHaveBeenCalled();
  });

  it("rejects a blank name without calling Better Auth", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await createPersonalAccessToken({ name: "   " });

    expect(result).toEqual({
      success: false,
      error: "Give this token a name so you can tell it apart later.",
    });
    expect(createApiKeyMock).not.toHaveBeenCalled();
  });

  it("rejects a name over the length limit", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await createPersonalAccessToken({ name: "a".repeat(101) });

    expect(result.success).toBe(false);
    expect(createApiKeyMock).not.toHaveBeenCalled();
  });

  it("rejects when rate limited, surfacing retryAfterSeconds", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      retryAfterSeconds: 20,
    });

    const result = await createPersonalAccessToken({ name: "My laptop" });

    expect(result).toEqual({
      success: false,
      error: "You're creating tokens too quickly. Try again in 20 seconds.",
      retryAfterSeconds: 20,
    });
    expect(createApiKeyMock).not.toHaveBeenCalled();
  });

  it("creates a token, trims the name, and returns the raw key once", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    createApiKeyMock.mockResolvedValueOnce({
      id: "key-1",
      key: "sk_live_abcdef",
    });

    const result = await createPersonalAccessToken({ name: "  My laptop  " });

    expect(createApiKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "My laptop" } })
    );
    expect(result).toEqual({
      success: true,
      data: { id: "key-1", token: "sk_live_abcdef" },
    });
  });
});

describe("revokePersonalAccessToken", () => {
  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await revokePersonalAccessToken({ tokenId: "key-1" });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to revoke a personal access token.",
    });
    expect(deleteApiKeyMock).not.toHaveBeenCalled();
  });

  it("revokes the token", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteApiKeyMock.mockResolvedValueOnce({ success: true });

    const result = await revokePersonalAccessToken({ tokenId: "key-1" });

    expect(deleteApiKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { keyId: "key-1" } })
    );
    expect(result).toEqual({ success: true, data: null });
  });

  it("turns a NOT_FOUND APIError (missing, or belongs to someone else) into a clean message", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteApiKeyMock.mockRejectedValueOnce(
      new APIError("NOT_FOUND", { message: "Api Key not found" })
    );

    const result = await revokePersonalAccessToken({ tokenId: "someone-elses-key" });

    expect(result).toEqual({
      success: false,
      error: "That token could not be found.",
    });
  });

  it("falls back to the generic message for any other failure", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteApiKeyMock.mockRejectedValueOnce(new Error("network error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await revokePersonalAccessToken({ tokenId: "key-1" });

    expect(result).toEqual({
      success: false,
      error: "Failed to revoke this token. Please try again.",
    });
    consoleError.mockRestore();
  });
});
