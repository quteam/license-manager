import { describe, expect, it } from "vitest";
import { addDaysIso, addMonthsIso, addYearsIso, isExpired, secondsUntil } from "../src/time";

describe("time helpers", () => {
  it("computes expiration from activation time", () => {
    expect(addDaysIso("2026-06-16T00:00:00.000Z", 7)).toBe("2026-06-23T00:00:00.000Z");
    expect(addMonthsIso("2026-06-16T00:00:00.000Z", 1)).toBe("2026-07-16T00:00:00.000Z");
    expect(addMonthsIso("2026-06-16T00:00:00.000Z", 3)).toBe("2026-09-16T00:00:00.000Z");
    expect(addYearsIso("2026-06-16T00:00:00.000Z", 1)).toBe("2027-06-16T00:00:00.000Z");
  });

  it("clips calendar durations to the target month end", () => {
    expect(addMonthsIso("2026-01-31T08:30:00.000Z", 1)).toBe("2026-02-28T08:30:00.000Z");
    expect(addMonthsIso("2026-11-30T08:30:00.000Z", 3)).toBe("2027-02-28T08:30:00.000Z");
    expect(addYearsIso("2024-02-29T08:30:00.000Z", 1)).toBe("2025-02-28T08:30:00.000Z");
  });

  it("detects expiration and remaining seconds", () => {
    const now = new Date("2026-06-16T00:00:00.000Z");
    expect(isExpired("2026-06-15T23:59:59.000Z", now)).toBe(true);
    expect(isExpired("2026-06-16T00:00:01.000Z", now)).toBe(false);
    expect(secondsUntil("2026-06-16T00:01:00.000Z", now)).toBe(60);
  });
});
