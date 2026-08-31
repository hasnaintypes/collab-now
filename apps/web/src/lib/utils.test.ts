import { describe, expect, it } from "vitest";
import { cn, parseStringify, getAccessType, dateConverter, getUserColor } from "./utils";

describe("cn", () => {
  it("merges class names and lets tailwind-merge resolve conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("parseStringify", () => {
  it("deep-clones a plain object", () => {
    const original = { a: 1, b: { c: 2 } };
    const clone = parseStringify(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.b).not.toBe(original.b);
  });

  it("drops properties JSON can't represent (e.g. undefined, functions)", () => {
    const original = { a: 1, b: undefined, c: () => "x" };
    expect(parseStringify(original)).toEqual({ a: 1 });
  });
});

describe("getAccessType", () => {
  it("maps creator/editor to full write access", () => {
    expect(getAccessType("creator")).toEqual(["room:write"]);
    expect(getAccessType("editor")).toEqual(["room:write"]);
  });

  it("maps viewer to read + presence access", () => {
    expect(getAccessType("viewer")).toEqual(["room:read", "room:presence:write"]);
  });

  it("falls back to read-only access for an unrecognized type", () => {
    expect(getAccessType("unknown" as UserType)).toEqual([
      "room:read",
      "room:presence:write",
    ]);
  });
});

describe("dateConverter", () => {
  it("formats sub-minute differences as 'Just now'", () => {
    expect(dateConverter(new Date().toISOString())).toBe("Just now");
  });

  it("formats minutes, hours, days, and weeks ago", () => {
    const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
    const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60_000).toISOString();
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

    expect(dateConverter(minutesAgo(5))).toBe("5 minutes ago");
    expect(dateConverter(hoursAgo(3))).toBe("3 hours ago");
    expect(dateConverter(daysAgo(2))).toBe("2 days ago");
    expect(dateConverter(daysAgo(14))).toBe("2 weeks ago");
  });
});

describe("getUserColor", () => {
  it("is deterministic for the same id", () => {
    expect(getUserColor("user-123")).toBe(getUserColor("user-123"));
  });

  it("always returns a color from the palette", () => {
    const color = getUserColor("some-other-user");
    expect(typeof color).toBe("string");
    expect(color?.startsWith("#")).toBe(true);
  });
});
