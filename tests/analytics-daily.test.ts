import { describe, it, expect } from "vitest";
import { aggregateDaily, aggregateDailyRevenue } from "@/lib/analytics/daily";

describe("aggregateDaily", () => {
  const NOW = Date.parse("2026-05-21T15:00:00.000Z"); // KST 00:00 next day

  it("returns a dense series of exactly windowDays entries", () => {
    const out = aggregateDaily([], 7, NOW);
    expect(out).toHaveLength(7);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });

  it("buckets rows into the correct KST date", () => {
    // NOW = 2026-05-21 15:00 UTC = 2026-05-22 00:00 KST → today's KST bucket = "2026-05-22".
    // All rows below convert to 2026-05-22 KST.
    const rows = [
      { created_at: "2026-05-21T15:30:00.000Z" }, // 2026-05-22 00:30 KST
      { created_at: "2026-05-21T20:00:00.000Z" }, // 2026-05-22 05:00 KST
      { created_at: "2026-05-22T01:00:00.000Z" }, // 2026-05-22 10:00 KST
    ];
    const out = aggregateDaily(rows, 7, NOW);
    const today = out[out.length - 1];
    expect(today.date).toBe("2026-05-22");
    expect(today.count).toBe(3);
  });

  it("ignores rows outside the window", () => {
    const rows = [
      { created_at: "2026-04-01T00:00:00.000Z" }, // way old
      { created_at: "2026-05-20T06:00:00.000Z" }, // yesterday — included
    ];
    const out = aggregateDaily(rows, 3, NOW);
    expect(out).toHaveLength(3);
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(1);
  });

  it("skips rows with invalid dates without crashing", () => {
    const rows = [
      { created_at: "not a date" },
      { created_at: "2026-05-21T05:00:00.000Z" },
    ];
    const out = aggregateDaily(rows, 7, NOW);
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(1);
  });

  it("entries are sorted oldest-first", () => {
    const out = aggregateDaily([], 5, NOW);
    for (let i = 0; i + 1 < out.length; i++) {
      expect(out[i].date <= out[i + 1].date).toBe(true);
    }
  });
});

describe("aggregateDailyRevenue", () => {
  const NOW = Date.parse("2026-05-21T15:00:00.000Z"); // KST 2026-05-22 00:00

  it("returns a dense series and zero-filled days", () => {
    const out = aggregateDailyRevenue([], 14, NOW);
    expect(out).toHaveLength(14);
    expect(out.every((b) => b.revenue === 0 && b.count === 0)).toBe(true);
  });

  it("sums revenue and counts per KST bucket", () => {
    const rows = [
      { updated_at: "2026-05-21T15:30:00.000Z", invoice_amount: 1_000_000 }, // 2026-05-22 KST
      { updated_at: "2026-05-21T20:00:00.000Z", invoice_amount: 2_500_000 }, // 2026-05-22 KST
      { updated_at: "2026-05-20T01:00:00.000Z", invoice_amount: 500_000 },   // 2026-05-20 KST
      { updated_at: "2026-05-19T06:00:00.000Z", invoice_amount: null },      // 2026-05-19 KST, no invoice
    ];
    const out = aggregateDailyRevenue(rows, 7, NOW);
    const byDate = new Map(out.map((b) => [b.date, b]));
    expect(byDate.get("2026-05-22")!.revenue).toBe(3_500_000);
    expect(byDate.get("2026-05-22")!.count).toBe(2);
    expect(byDate.get("2026-05-20")!.revenue).toBe(500_000);
    expect(byDate.get("2026-05-20")!.count).toBe(1);
    // Null invoice still counts as a delivery, just 0 revenue.
    expect(byDate.get("2026-05-19")!.revenue).toBe(0);
    expect(byDate.get("2026-05-19")!.count).toBe(1);
  });

  it("ignores rows outside the window or with bad dates", () => {
    const rows = [
      { updated_at: "2025-01-01T00:00:00.000Z", invoice_amount: 99_999_999 },
      { updated_at: "not a date", invoice_amount: 100 },
    ];
    const out = aggregateDailyRevenue(rows, 5, NOW);
    expect(out.reduce((s, b) => s + b.revenue, 0)).toBe(0);
  });
});
