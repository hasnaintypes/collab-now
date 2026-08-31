import { describe, expect, it } from "vitest";
import { encodeCursor, decodeCursor } from "./pagination";

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a cursor", () => {
    const cursor = { createdAt: "2024-01-01T00:00:00.000Z", id: "abc123" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("produces an opaque, URL-safe string", () => {
    const encoded = encodeCursor({ createdAt: "2024-01-01T00:00:00.000Z", id: "abc123" });
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });
});

describe("decodeCursor", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null for garbage input instead of throwing", () => {
    expect(decodeCursor("not-valid-base64url-json")).toBeNull();
  });

  it("returns null when the decoded payload is missing required fields", () => {
    const malformed = Buffer.from(JSON.stringify({ id: "abc123" }), "utf-8").toString(
      "base64url"
    );
    expect(decodeCursor(malformed)).toBeNull();
  });
});
