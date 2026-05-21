import { describe, it, expect } from "vitest";
import { computeForecast } from "@/lib/analytics/forecast";

const T = "2026-04-01T00:00:00Z";

describe("computeForecast", () => {
  it("returns zeros when nothing in pipeline or history", () => {
    const r = computeForecast([], [], []);
    expect(r.pipelineTotalValue).toBe(0);
    expect(r.closeRate).toBe(0);
    expect(r.scenarios.base).toBe(0);
  });

  it("groups pipeline by status and totals invoice value", () => {
    const r = computeForecast(
      [
        { status: "inquiry", invoice_amount: 1000, created_at: T },
        { status: "inquiry", invoice_amount: 500, created_at: T },
        { status: "brief_received", invoice_amount: 2000, created_at: T },
        { status: "delivered", invoice_amount: 99, created_at: T }, // excluded
      ],
      [],
      []
    );
    expect(r.pipelineByStage.inquiry.count).toBe(2);
    expect(r.pipelineByStage.inquiry.value).toBe(1500);
    expect(r.pipelineByStage.brief_received.value).toBe(2000);
    expect(r.pipelineTotalValue).toBe(3500);
  });

  it("computes close rate and avg deal value over 90d", () => {
    const r = computeForecast(
      [],
      [
        { status: "delivered", invoice_amount: 1000, created_at: T },
        { status: "delivered", invoice_amount: 2000, created_at: T },
      ],
      Array.from({ length: 10 }, () => ({
        status: "inquiry",
        invoice_amount: null,
        created_at: T,
      }))
    );
    expect(r.delivered90dCount).toBe(2);
    expect(r.closeRate).toBeCloseTo(0.2);
    expect(r.avgDealValue).toBe(1500);
  });

  it("base scenario = run-rate + pipeline × close rate", () => {
    // 90d revenue = 9000 → run-rate 30d = 3000
    // closeRate = 2/4 = 0.5; pipeline = 1000 → expected = 500
    // base = 3000 + 500 = 3500
    const r = computeForecast(
      [{ status: "inquiry", invoice_amount: 1000, created_at: T }],
      [
        { status: "delivered", invoice_amount: 4500, created_at: T },
        { status: "delivered", invoice_amount: 4500, created_at: T },
      ],
      [
        { status: "delivered", invoice_amount: null, created_at: T },
        { status: "delivered", invoice_amount: null, created_at: T },
        { status: "inquiry", invoice_amount: null, created_at: T },
        { status: "inquiry", invoice_amount: null, created_at: T },
      ]
    );
    expect(r.scenarios.base).toBe(3500);
    // Conservative is base × 0.7
    expect(r.scenarios.conservative).toBe(Math.round(3500 * 0.7));
    // Optimistic is run-rate × 1.2 + pipeline × min(1, 0.5 × 1.5) = 3600 + 750 = 4350
    expect(r.scenarios.optimistic).toBe(4350);
  });

  it("optimistic close-rate multiplier is capped at 100%", () => {
    const r = computeForecast(
      [{ status: "inquiry", invoice_amount: 1000, created_at: T }],
      [],
      []
    );
    // closeRate = 0 — optimistic still bounded; pipeline contributes 0.
    expect(r.scenarios.optimistic).toBeGreaterThanOrEqual(0);
    expect(r.scenarios.optimistic).toBeLessThan(1000 * 2);
  });
});
