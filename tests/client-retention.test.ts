import { describe, it, expect } from "vitest";
import {
  computeAtRiskClients,
  computeCohortRetention,
  cohortWindowMature,
  type ClientRetentionProjectRow,
} from "@/lib/analytics/client-retention";

// Fixed reference point so the silence math is deterministic. Picked a date
// past any of the synthesized cohort months below.
const NOW = new Date("2026-05-24T00:00:00Z").getTime();
const DAY = 86_400_000;

function delivery(
  clientId: string | null,
  iso: string,
  invoice: number | null = 1_000_000,
  client?: { company?: string | null; email?: string | null }
): ClientRetentionProjectRow {
  return {
    client_id: clientId,
    invoice_amount: invoice,
    delivered_at: iso,
    client: client ?? null,
  };
}

describe("computeAtRiskClients", () => {
  it("returns clients with ≥2 deliveries and last activity older than silentDays", () => {
    const rows: ClientRetentionProjectRow[] = [
      // Client A: 3 deliveries, last one 80d ago → at risk
      delivery("A", new Date(NOW - 200 * DAY).toISOString(), 1_000_000, {
        company: "AAA Beauty",
        email: "a@example.com",
      }),
      delivery("A", new Date(NOW - 150 * DAY).toISOString(), 2_000_000, {
        company: "AAA Beauty",
      }),
      delivery("A", new Date(NOW - 80 * DAY).toISOString(), 3_000_000, {
        company: "AAA Beauty",
      }),
      // Client B: 1 delivery → fails minDelivered=2
      delivery("B", new Date(NOW - 100 * DAY).toISOString(), 500_000, {
        company: "BBB Inc",
      }),
      // Client C: 2 deliveries, last one 20d ago → not silent enough
      delivery("C", new Date(NOW - 90 * DAY).toISOString(), 1_500_000, {
        company: "CCC",
      }),
      delivery("C", new Date(NOW - 20 * DAY).toISOString(), 1_500_000, {
        company: "CCC",
      }),
    ];
    const result = computeAtRiskClients(rows, { now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("A");
    expect(result[0].deliveredCount).toBe(3);
    expect(result[0].totalRevenue).toBe(6_000_000);
    expect(result[0].daysSilent).toBe(80);
  });

  it("sorts by revenue desc, breaks ties on silence (longer first)", () => {
    const rows: ClientRetentionProjectRow[] = [
      delivery("X", new Date(NOW - 120 * DAY).toISOString(), 5_000_000),
      delivery("X", new Date(NOW - 100 * DAY).toISOString(), 5_000_000),
      delivery("Y", new Date(NOW - 200 * DAY).toISOString(), 5_000_000),
      delivery("Y", new Date(NOW - 180 * DAY).toISOString(), 5_000_000),
      delivery("Z", new Date(NOW - 300 * DAY).toISOString(), 1_000_000),
      delivery("Z", new Date(NOW - 200 * DAY).toISOString(), 1_000_000),
    ];
    const result = computeAtRiskClients(rows, { now: NOW });
    // X & Y tied on revenue (10M each); Y has been silent longer (180d vs
    // 100d) so it should sort first.
    expect(result.map((r) => r.id)).toEqual(["Y", "X", "Z"]);
  });

  it("drops rows with no client_id", () => {
    const rows: ClientRetentionProjectRow[] = [
      delivery(null, new Date(NOW - 100 * DAY).toISOString(), 1_000_000),
      delivery(null, new Date(NOW - 90 * DAY).toISOString(), 1_000_000),
    ];
    expect(computeAtRiskClients(rows, { now: NOW })).toEqual([]);
  });

  it("honors limit and respects custom silentDays threshold", () => {
    const rows: ClientRetentionProjectRow[] = [];
    for (let i = 0; i < 5; i += 1) {
      const id = `C${i}`;
      rows.push(
        delivery(id, new Date(NOW - 120 * DAY).toISOString(), 1_000_000 * (i + 1)),
        delivery(id, new Date(NOW - 100 * DAY).toISOString(), 1_000_000 * (i + 1))
      );
    }
    const result = computeAtRiskClients(rows, {
      now: NOW,
      silentDays: 90,
      limit: 2,
    });
    expect(result).toHaveLength(2);
    // Highest revenue (C4 = 10M lifetime) should be first.
    expect(result[0].id).toBe("C4");
    expect(result[1].id).toBe("C3");
  });

  it("derives display company from email when company missing", () => {
    const rows: ClientRetentionProjectRow[] = [
      delivery("E", new Date(NOW - 200 * DAY).toISOString(), 1_000_000, {
        company: "  ",
        email: "fallback@example.com",
      }),
      delivery("E", new Date(NOW - 100 * DAY).toISOString(), 1_000_000, {
        company: "  ",
        email: "fallback@example.com",
      }),
    ];
    const result = computeAtRiskClients(rows, { now: NOW });
    expect(result[0].company).toBe("fallback@example.com");
  });
});

describe("computeCohortRetention", () => {
  it("buckets clients by month of first delivery and counts windowed repeats", () => {
    // 2 clients first-delivered in 2026-01:
    //   - cli1: repeat 40 days later → 60/90/180 all true
    //   - cli2: repeat 100 days later → 180 only
    // 1 client first-delivered in 2026-02:
    //   - cli3: no repeat
    const rows: ClientRetentionProjectRow[] = [
      delivery("cli1", "2026-01-10T00:00:00Z"),
      delivery("cli1", "2026-02-19T00:00:00Z"), // 40d
      delivery("cli2", "2026-01-15T00:00:00Z"),
      delivery("cli2", "2026-04-25T00:00:00Z"), // 100d
      delivery("cli3", "2026-02-05T00:00:00Z"),
    ];
    const result = computeCohortRetention(rows, { now: NOW, months: 6 });
    // Most-recent month first
    const jan = result.find((c) => c.cohortMonth === "2026-01");
    const feb = result.find((c) => c.cohortMonth === "2026-02");
    expect(jan).toBeDefined();
    expect(feb).toBeDefined();
    expect(jan!.size).toBe(2);
    expect(jan!.repeat60d).toBe(1);
    expect(jan!.repeat90d).toBe(1);
    expect(jan!.repeat180d).toBe(2);
    expect(jan!.repeat90dRate).toBeCloseTo(0.5);
    expect(jan!.repeat180dRate).toBeCloseTo(1.0);
    expect(feb!.size).toBe(1);
    expect(feb!.repeat60d).toBe(0);
    expect(feb!.repeat180dRate).toBe(0);
  });

  it("emits empty cohorts for months with no first-time clients", () => {
    const rows: ClientRetentionProjectRow[] = [
      delivery("only", "2026-01-15T00:00:00Z"),
    ];
    const result = computeCohortRetention(rows, { now: NOW, months: 6 });
    // Trailing 6 months from 2026-05 = 2026-05, 04, 03, 02, 01, 2025-12
    expect(result.map((r) => r.cohortMonth)).toEqual([
      "2026-05",
      "2026-04",
      "2026-03",
      "2026-02",
      "2026-01",
      "2025-12",
    ]);
    const empty = result.find((r) => r.cohortMonth === "2026-03");
    expect(empty!.size).toBe(0);
    expect(empty!.repeat90dRate).toBeNull();
  });

  it("treats anonymous rows as ignored, and same-client-on-same-day as the cohort anchor", () => {
    const rows: ClientRetentionProjectRow[] = [
      delivery(null, "2026-01-10T00:00:00Z"),
      delivery("dup", "2026-02-01T00:00:00Z"),
      delivery("dup", "2026-02-01T12:00:00Z"), // same day — counts as repeat at gap=12h, all windows
    ];
    const result = computeCohortRetention(rows, { now: NOW, months: 6 });
    const feb = result.find((r) => r.cohortMonth === "2026-02");
    expect(feb!.size).toBe(1);
    expect(feb!.repeat60d).toBe(1);
  });
});

describe("cohortWindowMature", () => {
  it("is true once end-of-month + window has elapsed", () => {
    // Cohort 2026-01 closes at 2026-02-01. 90d later = 2026-05-02. NOW =
    // 2026-05-24 → mature.
    expect(cohortWindowMature("2026-01", 90, NOW)).toBe(true);
  });
  it("is false when the window has not yet elapsed", () => {
    // Cohort 2026-03 closes 2026-04-01. 90d = 2026-06-30. NOW = 2026-05-24 → not yet.
    expect(cohortWindowMature("2026-03", 90, NOW)).toBe(false);
  });
  it("handles 60d window", () => {
    // 2026-02 closes 2026-03-01. +60d = 2026-04-30 → mature on NOW.
    expect(cohortWindowMature("2026-02", 60, NOW)).toBe(true);
    // 2026-04 closes 2026-05-01. +60d = 2026-06-30 → not mature.
    expect(cohortWindowMature("2026-04", 60, NOW)).toBe(false);
  });
});
