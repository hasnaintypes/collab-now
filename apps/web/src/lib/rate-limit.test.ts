import { describe, expect, it, vi, beforeEach } from "vitest";

// `checkRateLimit` talks to Postgres directly (see rate-limit.ts's own
// comment on why — no Redis/Upstash dependency). Unit-testing its decision
// logic means mocking the `db.insert(...).values(...).onConflictDoUpdate(...).returning()`
// chain rather than hitting a real database. `vi.hoisted` is required here
// because `vi.mock` factories run before this file's own top-level `const`s
// would otherwise be initialized.
const { returningMock, insertMock } = vi.hoisted(() => {
  const returningMock = vi.fn();
  const onConflictDoUpdate = vi.fn(() => ({ returning: returningMock }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insertMock = vi.fn(() => ({ values }));
  return { returningMock, insertMock };
});

vi.mock("@collabnow/db", () => ({
  db: { insert: insertMock },
  rateLimitBucket: { key: "key", count: "count", windowStart: "window_start" },
}));

const { checkRateLimit, formatRetryAfter } = await import("./rate-limit");

const config = { name: "test-limiter", limit: 5, windowMs: 60_000 };

beforeEach(() => {
  returningMock.mockReset();
});

describe("checkRateLimit", () => {
  it("succeeds while under the limit", async () => {
    returningMock.mockResolvedValueOnce([{ count: 3, windowStart: new Date() }]);

    const result = await checkRateLimit(config, "user-1");

    expect(result).toEqual({ success: true, limit: 5, remaining: 2 });
  });

  it("succeeds exactly at the limit (limit is inclusive)", async () => {
    returningMock.mockResolvedValueOnce([{ count: 5, windowStart: new Date() }]);

    const result = await checkRateLimit(config, "user-1");

    expect(result).toEqual({ success: true, limit: 5, remaining: 0 });
  });

  it("fails once over the limit, with a positive retryAfterSeconds", async () => {
    const windowStart = new Date(Date.now() - 10_000); // 10s into a 60s window
    returningMock.mockResolvedValueOnce([{ count: 6, windowStart }]);

    const result = await checkRateLimit(config, "user-1");

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(50);
  });

  it("fails open if the upsert unexpectedly returns no row", async () => {
    returningMock.mockResolvedValueOnce([]);

    const result = await checkRateLimit(config, "user-1");

    expect(result).toEqual({ success: true, limit: 5, remaining: 4 });
  });

  it("scopes the bucket key by limiter name and identifier", async () => {
    returningMock.mockResolvedValueOnce([{ count: 1, windowStart: new Date() }]);
    await checkRateLimit(config, "user-42");

    const valuesMock = insertMock.mock.results[insertMock.mock.results.length - 1]!
      .value.values as ReturnType<typeof vi.fn>;
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: "test-limiter:user-42" })
    );
  });
});

describe("formatRetryAfter", () => {
  it("formats sub-minute durations in seconds", () => {
    expect(formatRetryAfter(1)).toBe("1 second");
    expect(formatRetryAfter(45)).toBe("45 seconds");
  });

  it("formats minute-plus durations in minutes, rounded up", () => {
    expect(formatRetryAfter(60)).toBe("1 minute");
    expect(formatRetryAfter(61)).toBe("2 minutes");
    expect(formatRetryAfter(150)).toBe("3 minutes");
  });
});
