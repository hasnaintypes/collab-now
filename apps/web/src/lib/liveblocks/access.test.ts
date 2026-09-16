import { describe, expect, it } from "vitest";
import { getAccessType } from "./access";

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
