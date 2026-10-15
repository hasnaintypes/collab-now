import { describe, expect, it, vi, beforeEach } from "vitest";

// `authenticateExtensionRequest` is the shared `x-api-key` resolution
// every `/api/extension/*` route handler (P2-6's `me`, P2-7's
// `generate`/`jobs/[id]`) delegates to. Mocking style matches the other
// `@collabnow/db`/`@/features/auth/lib` mocks used throughout
// `features/*/actions/*.test.ts`.
function selectChain(rows: unknown[]) {
  const builder: {
    from: () => typeof builder;
    where: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {} as never;
  builder.from = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

const { dbMock } = vi.hoisted(() => ({ dbMock: { select: vi.fn() } }));
vi.mock("@collabnow/db", () => ({
  db: dbMock,
  user: { id: "user.id", name: "user.name", email: "user.email" },
}));

const { verifyApiKeyMock } = vi.hoisted(() => ({
  verifyApiKeyMock: vi.fn(),
}));
vi.mock("@/features/auth/lib", () => ({
  auth: { api: { verifyApiKey: verifyApiKeyMock } },
}));

const { authenticateExtensionRequest } = await import("./extension-auth");

function requestWith(apiKey: string | null) {
  const headers = new Headers();
  if (apiKey !== null) headers.set("x-api-key", apiKey);
  return new Request("http://localhost/api/extension/me", { headers });
}

beforeEach(() => {
  dbMock.select.mockReset();
  verifyApiKeyMock.mockReset();
});

describe("authenticateExtensionRequest", () => {
  it("fails when the x-api-key header is missing", async () => {
    const result = await authenticateExtensionRequest(requestWith(null));

    expect(result).toEqual({ ok: false, error: "Missing x-api-key header." });
    expect(verifyApiKeyMock).not.toHaveBeenCalled();
  });

  it("fails when the key doesn't verify", async () => {
    verifyApiKeyMock.mockResolvedValueOnce({ valid: false, key: null });

    const result = await authenticateExtensionRequest(requestWith("bad-key"));

    expect(result).toEqual({
      ok: false,
      error: "Invalid or expired personal access token.",
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("fails when the key is valid but its user no longer exists", async () => {
    verifyApiKeyMock.mockResolvedValueOnce({
      valid: true,
      key: { referenceId: "user-1" },
    });
    dbMock.select.mockReturnValueOnce(selectChain([]));

    const result = await authenticateExtensionRequest(requestWith("good-key"));

    expect(result).toEqual({
      ok: false,
      error: "Invalid or expired personal access token.",
    });
  });

  it("resolves the account for a valid key", async () => {
    verifyApiKeyMock.mockResolvedValueOnce({
      valid: true,
      key: { referenceId: "user-1" },
    });
    dbMock.select.mockReturnValueOnce(
      selectChain([{ id: "user-1", name: "Ada", email: "ada@example.com" }])
    );

    const result = await authenticateExtensionRequest(requestWith("good-key"));

    expect(result).toEqual({
      ok: true,
      user: { id: "user-1", name: "Ada", email: "ada@example.com" },
    });
  });

  it("sends the raw header value to verifyApiKey, never parsing/transforming it", async () => {
    verifyApiKeyMock.mockResolvedValueOnce({ valid: false, key: null });

    await authenticateExtensionRequest(requestWith("literal-token-value"));

    expect(verifyApiKeyMock).toHaveBeenCalledWith({
      body: { key: "literal-token-value" },
    });
  });
});
