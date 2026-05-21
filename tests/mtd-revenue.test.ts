import { describe, it, expect } from "vitest";
import { computeMtdRevenue } from "@/lib/analytics/mtd-revenue";

// 2026-05-15 12:00 UTC — mid-month so windows are easy to reason about.
const NOW = Date.parse("2026-05-15T12:00:00Z");

describe("computeMtdRevenue", () => {
  it("returns zeros for empty input but sane day fields", () => {
    const r = computeMtdRevenue([], NOW);
    expect(r.mtdRevenue).toBe(0);
    expect(r.priorMonthTotal).toBe(0);
    expect(r.projectedMonthEnd).toBe(0);
    expect(r.daysInMonth).toBe(31); // May
  });

  it("sums delivered rows in current month", () => {
    const r = computeMtdRevenue(
      [
        { updated_at: "2026-05-01T00:01:00Z", invoice_amount: 1000 },
        { updated_at: "2026-05-10T15:00:00Z", invoice_amount: 2000 },
        { updated_at: "2026-04-28T15:00:00Z", invoice_amount: 9999 }, // prior month
        { updated_at: "2026-05-15T11:59:00Z", invoice_amount: 500 },
      ],
      NOW
    );
    expect(r.mtdRevenue).toBe(3500);
  });

  it("projects month-end via run-rate (linear)", () => {
    // 1000 over 15 days → ~2066 projected over 31 days
    const r = computeMtdRevenue(
      [{ updated_at: "2026-05-10T00:00:00Z", invoice_amount: 1000 }],
      NOW
    );
    expect(r.projectedMonthEnd).toBeGreaterThan(2000);
    expect(r.projectedMonthEnd).toBeLessThan(2200);
  });

  it("separates prior calendar month total", () => {
    const r = computeMtdRevenue(
      [
        { updated_at: "2026-04-15T00:00:00Z", invoice_amount: 5000 },
        { updated_at: "2026-04-30T23:00:00Z", invoice_amount: 1000 },
        { updated_at: "2026-03-15T00:00:00Z", invoice_amount: 99 }, // two months ago
        { updated_at: "2026-05-01T00:00:00Z", invoice_amount: 200 },
      ],
      NOW
    );
    expect(r.priorMonthTotal).toBe(6000);
    expect(r.mtdRevenue).toBe(200);
  });

  it("ignores unparseable timestamps", () => {
    const r = computeMtdRevenue(
      [
        { updated_at: "not a date", invoice_amount: 99 },
        { updated_at: "2026-05-10T00:00:00Z", invoice_amount: 100 },
      ],
      NOW
    );
    expect(r.mtdRevenue).toBe(100);
  });

  it("treats null invoice_amount as zero", () => {
    const r = computeMtdRevenue(
      [{ updated_at: "2026-05-10T00:00:00Z", invoice_amount: null }],
      NOW
    );
    expect(r.mtdRevenue).toBe(0);
  });
});
