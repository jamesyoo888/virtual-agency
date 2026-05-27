import { describe, it, expect } from "vitest";
import { aggregateAgentAttribution } from "@/lib/analytics/agent-attribution";

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
