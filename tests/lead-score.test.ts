import { describe, it, expect } from "vitest";
import { computeLeadScore } from "@/lib/analytics/lead-score";

const NOW = Date.parse("2026-05-21T10:00:00.000Z");

describe("computeLeadScore", () => {
  it("cold tier for a no-signal inquiry", () => {
    const r = computeLeadScore({
      createdAt: "2026-05-15T00:00:00.000Z",
      nowMs: NOW,
    });
    expect(r.tier).toBe("cold");
    expect(r.score).toBe(0);
  });

  it("warm tier for utm + brief", () => {
    const r = computeLeadScore({
      utmSource: "naver",
      brief: "x".repeat(100),
      createdAt: "2026-05-15T00:00:00.000Z",
      nowMs: NOW,
    });
    expect(r.tier).toBe("warm");
    expect(r.reasons).toContain("utm:naver");
    expect(r.reasons).toContain("brief");
  });

  it("hot tier when repeat customer alone + utm", () => {
    const r = computeLeadScore({
      utmSource: "referral",
      utmCampaign: "client-xyz",
      brief: "longish",
      priorDeliveredCount: 2,
      createdAt: "2026-05-15T00:00:00.000Z",
      nowMs: NOW,
    });
    expect(r.tier).toBe("hot");
    expect(r.reasons).toContain("repeat×2");
  });

  it("fresh bonus applies to recent inquiries", () => {
    const r = computeLeadScore({
      createdAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
      nowMs: NOW,
    });
    expect(r.reasons).toContain("fresh<2h");
  });

  it("does not apply fresh bonus to inquiries older than 2h", () => {
    const r = computeLeadScore({
      createdAt: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(),
      nowMs: NOW,
    });
    expect(r.reasons).not.toContain("fresh<2h");
  });

  it("referrer without utm counts as half a point", () => {
    const r = computeLeadScore({
      referrer: "https://example.com",
      brief: "x".repeat(80),
      createdAt: "2026-05-15T00:00:00.000Z",
      nowMs: NOW,
    });
    expect(r.reasons).toContain("referrer");
    expect(r.score).toBeCloseTo(1.5, 5);
  });
});
