import { describe, it, expect } from "vitest";
import {
  aggregateAgentAttribution,
  aggregateAllAgentAttribution,
  AGENT_COMMISSION_RATE,
} from "@/lib/analytics/agent-attribution";

describe("aggregateAgentAttribution", () => {
  it("returns zero on empty rows", () => {
    const out = aggregateAgentAttribution("agent-1", [], 90);
    expect(out.totalInquiries).toBe(0);
    expect(out.totalDelivered).toBe(0);
    expect(out.totalRevenue).toBe(0);
    expect(out.characterFunnel).toBe(0);
    expect(out.blogFunnel).toBe(0);
  });

  it("counts inquiries, delivered, revenue", () => {
    const rows = [
      { status: "inquiry", invoice_amount: 0, referrer: null },
      { status: "delivered", invoice_amount: 3_000_000, referrer: null },
      { status: "delivered", invoice_amount: 1_500_000, referrer: null },
    ];
    const out = aggregateAgentAttribution("agent-1", rows, 90);
    expect(out.totalInquiries).toBe(3);
    expect(out.totalDelivered).toBe(2);
    expect(out.totalRevenue).toBe(4_500_000);
  });

  it("buckets character + blog funnel overlap via referrer match", () => {
    const rows = [
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: "https://aihubs.uk/character/yuna",
      },
      {
        status: "delivered",
        invoice_amount: 2_000_000,
        referrer: "https://aihubs.uk/en/character/ren",
      },
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: "https://aihubs.uk/blog/how-to-brief",
      },
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: "https://aihubs.uk/en/blog/cross-market-launch",
      },
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: "https://aihubs.uk/pricing",
      },
    ];
    const out = aggregateAgentAttribution("agent-1", rows, 90);
    expect(out.totalInquiries).toBe(5);
    expect(out.characterFunnel).toBe(2);
    expect(out.blogFunnel).toBe(2);
  });

  it("coerces string invoice_amount values", () => {
    const rows = [
      {
        status: "delivered",
        invoice_amount: "750000.25",
        referrer: null,
      },
    ];
    const out = aggregateAgentAttribution("agent-1", rows, 90);
    expect(out.totalRevenue).toBeCloseTo(750000.25);
  });
});

describe("aggregateAllAgentAttribution", () => {
  const baseCreated = "2026-05-25T10:00:00Z";

  it("returns zero state with empty daily series on no rows", () => {
    const out = aggregateAllAgentAttribution([], 7);
    expect(out.totalInquiries).toBe(0);
    expect(out.totalDelivered).toBe(0);
    expect(out.totalRevenue).toBe(0);
    expect(out.commissionEstimate).toBe(0);
    expect(out.byAgent).toEqual([]);
    // aggregateDaily zero-fills to windowDays length
    expect(out.daily.length).toBe(7);
  });

  it("splits inquiries per agent and orders by inquiries desc", () => {
    const rows = [
      {
        status: "delivered",
        invoice_amount: 5_000_000,
        utm_campaign: "agent-A",
        created_at: baseCreated,
      },
      {
        status: "inquiry",
        invoice_amount: 0,
        utm_campaign: "agent-A",
        created_at: baseCreated,
      },
      {
        status: "delivered",
        invoice_amount: 2_000_000,
        utm_campaign: "agent-B",
        created_at: baseCreated,
      },
    ];
    const out = aggregateAllAgentAttribution(rows, 30);
    expect(out.totalInquiries).toBe(3);
    expect(out.totalDelivered).toBe(2);
    expect(out.totalRevenue).toBe(7_000_000);
    expect(out.byAgent).toHaveLength(2);
    expect(out.byAgent[0].agentId).toBe("agent-A");
    expect(out.byAgent[0].inquiries).toBe(2);
    expect(out.byAgent[0].delivered).toBe(1);
    expect(out.byAgent[0].conversionPct).toBe(50);
    expect(out.byAgent[1].agentId).toBe("agent-B");
    expect(out.byAgent[1].conversionPct).toBe(100);
  });

  it("estimates commission as 15% of delivered revenue, rounded", () => {
    const rows = [
      {
        status: "delivered",
        invoice_amount: 10_000_000,
        utm_campaign: "agent-X",
        created_at: baseCreated,
      },
    ];
    const out = aggregateAllAgentAttribution(rows, 30);
    expect(AGENT_COMMISSION_RATE).toBe(0.15);
    expect(out.commissionEstimate).toBe(1_500_000);
  });

  it("ignores rows with blank utm_campaign for per-agent breakdown but counts totals", () => {
    const rows = [
      {
        status: "delivered",
        invoice_amount: 1_000_000,
        utm_campaign: null,
        created_at: baseCreated,
      },
      {
        status: "delivered",
        invoice_amount: 2_000_000,
        utm_campaign: "  ",
        created_at: baseCreated,
      },
      {
        status: "delivered",
        invoice_amount: 3_000_000,
        utm_campaign: "agent-X",
        created_at: baseCreated,
      },
    ];
    const out = aggregateAllAgentAttribution(rows, 30);
    expect(out.totalInquiries).toBe(3);
    expect(out.totalRevenue).toBe(6_000_000);
    expect(out.byAgent).toHaveLength(1);
    expect(out.byAgent[0].agentId).toBe("agent-X");
    expect(out.byAgent[0].revenue).toBe(3_000_000);
  });
});
