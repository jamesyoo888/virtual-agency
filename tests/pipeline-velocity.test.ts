import { describe, it, expect } from "vitest";
import {
  computePipelineVelocity,
  type VelocityRow,
} from "@/lib/analytics/pipeline-velocity";

const NOW = Date.parse("2026-05-25T00:00:00Z");
const D = (iso: string) => Date.parse(iso);

function row(createdIso: string, deliveredIso: string): VelocityRow {
  return { createdAtMs: D(createdIso), deliveredAtMs: D(deliveredIso) };
}

describe("computePipelineVelocity", () => {
  it("returns zero report when no rows", () => {
    const r = computePipelineVelocity([], { now: NOW });
    expect(r.n).toBe(0);
    expect(r.medianDays).toBeNull();
    expect(r.p90Days).toBeNull();
    expect(r.fastestDays).toBeNull();
    expect(r.slowestDays).toBeNull();
  });

  it("computes median + fastest + slowest in days", () => {
    const rows = [
      row("2026-05-01T00:00:00Z", "2026-05-04T00:00:00Z"), // 3d
      row("2026-05-02T00:00:00Z", "2026-05-07T00:00:00Z"), // 5d
      row("2026-05-10T00:00:00Z", "2026-05-20T00:00:00Z"), // 10d
    ];
    const r = computePipelineVelocity(rows, { now: NOW });
    expect(r.n).toBe(3);
    expect(r.medianDays).toBe(5);
    expect(r.fastestDays).toBe(3);
    expect(r.slowestDays).toBe(10);
  });

  it("hides p90 when n<5 (too noisy)", () => {
    const rows = [
      row("2026-05-01T00:00:00Z", "2026-05-02T00:00:00Z"),
      row("2026-05-01T00:00:00Z", "2026-05-03T00:00:00Z"),
    ];
    const r = computePipelineVelocity(rows, { now: NOW });
    expect(r.p90Days).toBeNull();
  });

  it("publishes p90 when n>=5", () => {
    // 1, 2, 3, 4, 10 → ceil(0.9*5) = 5 → 5th element (index 4) = 10
    const rows = [
      row("2026-05-01T00:00:00Z", "2026-05-02T00:00:00Z"),
      row("2026-05-01T00:00:00Z", "2026-05-03T00:00:00Z"),
      row("2026-05-01T00:00:00Z", "2026-05-04T00:00:00Z"),
      row("2026-05-01T00:00:00Z", "2026-05-05T00:00:00Z"),
      row("2026-05-01T00:00:00Z", "2026-05-11T00:00:00Z"),
    ];
    const r = computePipelineVelocity(rows, { now: NOW });
    expect(r.p90Days).toBe(10);
    expect(r.medianDays).toBe(3);
  });

  it("excludes deliveries outside the window", () => {
    const rows = [
      // 200 days old delivery, outside the default 90d window
      row("2025-10-01T00:00:00Z", "2025-11-01T00:00:00Z"),
      row("2026-05-01T00:00:00Z", "2026-05-04T00:00:00Z"),
    ];
    const r = computePipelineVelocity(rows, { now: NOW, windowDays: 90 });
    expect(r.n).toBe(1);
    expect(r.medianDays).toBe(3);
  });

  it("drops rows where delivered precedes created (clock skew)", () => {
    const rows = [
      { createdAtMs: D("2026-05-10T00:00:00Z"), deliveredAtMs: D("2026-05-09T00:00:00Z") },
      row("2026-05-01T00:00:00Z", "2026-05-04T00:00:00Z"),
    ];
    const r = computePipelineVelocity(rows, { now: NOW });
    expect(r.n).toBe(1);
  });

  it("byMonth keyed on delivery month (UTC) with empty months preserved", () => {
    const rows = [
      row("2026-05-01T00:00:00Z", "2026-05-04T00:00:00Z"), // May → 3d
      row("2026-05-05T00:00:00Z", "2026-05-12T00:00:00Z"), // May → 7d
      row("2026-04-01T00:00:00Z", "2026-04-10T00:00:00Z"), // Apr → 9d
    ];
    const r = computePipelineVelocity(rows, { now: NOW, months: 3 });
    expect(r.byMonth).toHaveLength(3);
    // Most-recent first
    expect(r.byMonth[0].month).toBe("2026-05");
    expect(r.byMonth[0].n).toBe(2);
    expect(r.byMonth[0].medianDays).toBe(3); // nearest-rank: ceil(0.5*2)-1 = 0 → idx 0 = 3
    expect(r.byMonth[1].month).toBe("2026-04");
    expect(r.byMonth[1].n).toBe(1);
    expect(r.byMonth[1].medianDays).toBe(9);
    expect(r.byMonth[2].month).toBe("2026-03");
    expect(r.byMonth[2].n).toBe(0);
    expect(r.byMonth[2].medianDays).toBeNull();
  });

  it("sub-day deliveries round to one decimal (not 0)", () => {
    const created = D("2026-05-20T00:00:00Z");
    const delivered = created + 6 * 60 * 60 * 1000; // 6 hours
    const r = computePipelineVelocity(
      [{ createdAtMs: created, deliveredAtMs: delivered }],
      { now: NOW }
    );
    expect(r.medianDays).toBeCloseTo(0.3, 1);
  });
});
