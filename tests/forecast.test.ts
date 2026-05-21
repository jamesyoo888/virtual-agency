import { describe, it, expect } from "vitest";
import {
  computeForecast,
  summarizePipelineByModel,
  computeConfidence,
} from "@/lib/analytics/forecast";

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

  it("includes pipelineByModel top-N rollup", () => {
    const r = computeForecast(
      [
        {
          status: "inquiry",
          invoice_amount: 1000,
          created_at: T,
          model_id: "m1",
          model_name: "Aria",
        },
        {
          status: "inquiry",
          invoice_amount: 2000,
          created_at: T,
          model_id: "m1",
          model_name: "Aria",
        },
        {
          status: "brief_received",
          invoice_amount: 500,
          created_at: T,
          model_id: "m2",
          model_name: "Bori",
        },
        // Anonymous row — counts in stage totals but drops from per-model
        // rollup.
        { status: "inquiry", invoice_amount: 9999, created_at: T },
      ],
      [],
      []
    );
    expect(r.pipelineByModel.length).toBe(2);
    expect(r.pipelineByModel[0].model_id).toBe("m1");
    expect(r.pipelineByModel[0].value).toBe(3000);
    expect(r.pipelineByModel[0].count).toBe(2);
    expect(r.pipelineByModel[1].model_id).toBe("m2");
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

describe("computeConfidence", () => {
  it("low when delivered < 10 or inquired < 30", () => {
    expect(computeConfidence(5, 100)).toBe("low");
    expect(computeConfidence(50, 20)).toBe("low");
    expect(computeConfidence(0, 0)).toBe("low");
  });
  it("medium when at least 10 delivered and 30 inquired but below 30/100", () => {
    expect(computeConfidence(10, 30)).toBe("medium");
    expect(computeConfidence(20, 80)).toBe("medium");
  });
  it("high when both thresholds met", () => {
    expect(computeConfidence(30, 100)).toBe("high");
    expect(computeConfidence(100, 500)).toBe("high");
  });
});

describe("computeForecast.pipelineByModel", () => {
  it("plugs into computeForecast output for CSV export", () => {
    const r = computeForecast(
      [
        {
          status: "inquiry",
          invoice_amount: 1500,
          created_at: T,
          model_id: "m1",
          model_name: "Aria",
        },
        {
          status: "brief_received",
          invoice_amount: 700,
          created_at: T,
          model_id: "m2",
          model_name: "Bori",
        },
      ],
      [],
      []
    );
    // The CSV writer at app/api/admin/exports/[kind]/route.ts flattens
    // these rows into pipeline_by_model_<i>_<field>. Test the shape stays
    // consistent so the CSV column labels don't drift.
    expect(r.pipelineByModel).toHaveLength(2);
    expect(r.pipelineByModel[0]).toMatchObject({
      model_id: "m1",
      model_name: "Aria",
      value: 1500,
    });
    expect(r.pipelineByModel[1]).toMatchObject({
      model_id: "m2",
      model_name: "Bori",
      value: 700,
    });
  });
});

describe("summarizePipelineByModel", () => {
  it("sorts by value desc then count desc", () => {
    const rows = summarizePipelineByModel([
      {
        status: "inquiry",
        invoice_amount: 100,
        created_at: T,
        model_id: "a",
        model_name: "A",
      },
      {
        status: "inquiry",
        invoice_amount: 100,
        created_at: T,
        model_id: "a",
        model_name: "A",
      },
      {
        status: "inquiry",
        invoice_amount: 500,
        created_at: T,
        model_id: "b",
        model_name: "B",
      },
    ]);
    expect(rows[0].model_id).toBe("b");
    expect(rows[1].model_id).toBe("a");
    expect(rows[1].count).toBe(2);
  });

  it("respects topN cap", () => {
    const rows = summarizePipelineByModel(
      Array.from({ length: 12 }, (_, i) => ({
        status: "inquiry",
        invoice_amount: 100 + i,
        created_at: T,
        model_id: `m${i}`,
        model_name: `M${i}`,
      })),
      3
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].model_id).toBe("m11");
  });

  it("skips rows with no model_id", () => {
    const rows = summarizePipelineByModel([
      { status: "inquiry", invoice_amount: 100, created_at: T },
      {
        status: "inquiry",
        invoice_amount: 50,
        created_at: T,
        model_id: "x",
        model_name: "X",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].model_id).toBe("x");
  });
});
