import { describe, expect, it } from "vitest";
import { PLAN_NOTES_LIMIT, planIncludesChat } from "./plan-limits";

describe("PLAN_NOTES_LIMIT", () => {
  it("defines a positive cap for every plan", () => {
    expect(PLAN_NOTES_LIMIT.free).toBeGreaterThan(0);
    expect(PLAN_NOTES_LIMIT.pro).toBeGreaterThan(0);
    expect(PLAN_NOTES_LIMIT.team).toBeGreaterThan(0);
  });

  it("gives paid plans a strictly higher cap than free", () => {
    expect(PLAN_NOTES_LIMIT.pro).toBeGreaterThan(PLAN_NOTES_LIMIT.free);
    expect(PLAN_NOTES_LIMIT.team).toBeGreaterThan(PLAN_NOTES_LIMIT.free);
  });
});

describe("planIncludesChat", () => {
  it("excludes chat from the free plan", () => {
    expect(planIncludesChat("free")).toBe(false);
  });

  it("includes chat on pro and team", () => {
    expect(planIncludesChat("pro")).toBe(true);
    expect(planIncludesChat("team")).toBe(true);
  });
});
