import { describe, it, expect } from "vitest";
import { wowFromRows } from "@/lib/analytics/week-over-week";

const NOW = Date.parse("2026-05-21T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function at(daysAgo: number): string {
  return new Date(NOW - daysAgo * DAY).toISOString();
}

describe("wowFromRows", () => {
  it("returns zeros for empty input", () => {
    const r = wowFromRows([], { nowMs: NOW });
    expect(r).toEqual({ current: 0, previous: 0, delta: 0, pct: null });
  });

  it("buckets rows into current and previous 7-day windows", () => {
    const rows = [
      { created_at: at(0) },
      { created_at: at(3) },
      { created_at: at(6) },
      { created_at: at(8) },
      { created_at: at(10) },
      { created_at: at(20) }, // out of both windows
    ];
    const r = wowFromRows(rows, { nowMs: NOW });
    expect(r.current).toBe(3);
    expect(r.previous).toBe(2);
    expect(r.delta).toBe(1);
    expect(r.pct).toBeCloseTo(50);
  });

  it("returns null pct when previous is zero", () => {
    const rows = [{ created_at: at(1) }, { created_at: at(2) }];
    const r = wowFromRows(rows, { nowMs: NOW });
    expect(r.previous).toBe(0);
    expect(r.pct).toBeNull();
  });

  it("weighted mode sums invoice_amount", () => {
    const rows = [
      { updated_at: at(0), invoice_amount: 1000 },
      { updated_at: at(3), invoice_amount: 500 },
      { updated_at: at(8), invoice_amount: 2000 },
      { updated_at: at(11), invoice_amount: 300 },
    ];
    const r = wowFromRows(rows, {
      nowMs: NOW,
      dateField: "updated_at",
      weighted: true,
    });
    expect(r.current).toBe(1500);
    expect(r.previous).toBe(2300);
    expect(r.delta).toBe(-800);
    expect(r.pct).toBeCloseTo((-800 / 2300) * 100);
  });

  it("ignores unparseable dates", () => {
    const r = wowFromRows(
      [{ created_at: "not-a-date" }, { created_at: at(2) }],
      { nowMs: NOW }
    );
    expect(r.current).toBe(1);
  });
});
