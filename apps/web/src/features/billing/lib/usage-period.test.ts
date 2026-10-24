import { describe, expect, it } from "vitest";
import { currentUsagePeriod } from "./usage-period";

describe("currentUsagePeriod", () => {
  it("starts at the 1st of the given date's UTC month", () => {
    const { periodStart } = currentUsagePeriod(
      new Date("2026-03-17T12:34:56Z")
    );

    expect(periodStart.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("ends at the 1st of the following UTC month", () => {
    const { periodEnd } = currentUsagePeriod(new Date("2026-03-17T12:34:56Z"));

    expect(periodEnd.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("rolls over the year at a December boundary", () => {
    const { periodStart, periodEnd } = currentUsagePeriod(
      new Date("2026-12-25T00:00:00Z")
    );

    expect(periodStart.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
