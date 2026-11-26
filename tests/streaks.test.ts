import { describe, expect, it } from "vitest";
import { addDays, dayRange, localDay } from "@/lib/shared/dates";
import { computeStreak, perfectDays } from "@/lib/shared/streaks";

describe("dates", () => {
  it("adds days across month/DST boundaries", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });
  it("respects day start hour", () => {
    const d = new Date(2026, 10, 26, 2, 0); // 2am local
    expect(localDay(d, 0)).toBe("2026-11-26");
    expect(localDay(d, 3)).toBe("2026-11-25");
  });
  it("builds ranges", () => {
    expect(dayRange("2026-01-02", 3)).toEqual(["2025-12-31", "2026-01-01", "2026-01-02"]);
  });
});

describe("streaks", () => {
  const today = "2026-11-26";
  it("counts a streak including today", () => {
    expect(computeStreak(["2026-11-24", "2026-11-25", "2026-11-26"], today)).toEqual({ current: 3, best: 3, atRisk: false });
  });
  it("keeps the streak alive until today is over", () => {
    expect(computeStreak(["2026-11-24", "2026-11-25"], today)).toEqual({ current: 2, best: 2, atRisk: true });
  });
  it("breaks after a missed day and tracks best", () => {
    const s = computeStreak(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-24"], today);
    expect(s).toEqual({ current: 0, best: 4, atRisk: false });
  });
  it("finds perfect days", () => {
    const m = new Map([
      ["2026-11-25", new Set(["a", "b"])],
      ["2026-11-26", new Set(["a"])],
    ]);
    expect(perfectDays(m, ["a", "b"])).toEqual(["2026-11-25"]);
  });
});
