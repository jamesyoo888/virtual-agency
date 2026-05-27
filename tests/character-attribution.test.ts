import { describe, it, expect } from "vitest";
import {
  parseSlugFromCampaign,
  parseTierFromCampaign,
  summarizeCharacterAttribution,
} from "@/lib/analytics/character-attribution";

describe("parseSlugFromCampaign", () => {
  it("extracts the slug from the character_<slug> form", () => {
    expect(parseSlugFromCampaign("character_yuna")).toBe("yuna");
    expect(parseSlugFromCampaign("character_ren")).toBe("ren");
  });

  it("returns null for non-character campaigns or missing values", () => {
    expect(parseSlugFromCampaign(null)).toBeNull();
    expect(parseSlugFromCampaign(undefined)).toBeNull();
    expect(parseSlugFromCampaign("")).toBeNull();
    expect(parseSlugFromCampaign("summer_2026")).toBeNull();
  });

  it("rejects malformed slug suffixes (defensive)", () => {
    expect(parseSlugFromCampaign("character_Yuna")).toBeNull(); // upper
    expect(parseSlugFromCampaign("character_ren$")).toBeNull(); // bad char
    expect(parseSlugFromCampaign("character_" + "a".repeat(40))).toBeNull();
  });
});

describe("parseTierFromCampaign", () => {
  it("extracts tier from brand_kit_<tier>", () => {
    expect(parseTierFromCampaign("brand_kit_paired")).toBe("paired");
    expect(parseTierFromCampaign("brand_kit_season")).toBe("season");
    expect(parseTierFromCampaign("brand_kit_custom")).toBe("custom");
    expect(parseTierFromCampaign("brand_kit_index")).toBe("index");
  });

  it("returns null for non-tier campaigns", () => {
    expect(parseTierFromCampaign(null)).toBeNull();
    expect(parseTierFromCampaign("character_yuna")).toBeNull();
    expect(parseTierFromCampaign("anything_else")).toBeNull();
  });
});

describe("summarizeCharacterAttribution", () => {
  it("buckets rows by slug with delivered + conversion + revenue", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: 0 },
      { status: "delivered", utm_campaign: "character_yuna", invoice_amount: 8_500_000 },
      { status: "inquiry", utm_campaign: "character_ren", invoice_amount: null },
      { status: "delivered", utm_campaign: "character_yuna", invoice_amount: 2_500_000 },
    ]);
    expect(summary.totalInquiries).toBe(4);
    expect(summary.totalDelivered).toBe(2);
    expect(summary.totalRevenue).toBe(11_000_000);
    expect(summary.bySlug[0]).toEqual({
      slug: "yuna",
      inquiries: 3,
      delivered: 2,
      revenue: 11_000_000,
      conversionPct: 67,
    });
    expect(summary.bySlug[1]).toEqual({
      slug: "ren",
      inquiries: 1,
      delivered: 0,
      revenue: 0,
      conversionPct: 0,
    });
    expect(summary.unknown).toBe(0);
  });

  it("revenue only counts on delivered rows (inquiry rows never inflate)", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: 5_000_000 },
      { status: "in_progress", utm_campaign: "character_yuna", invoice_amount: 5_000_000 },
    ]);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.bySlug[0].revenue).toBe(0);
  });

  it("counts unparseable utm_campaign rows as unknown without skewing totals", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: null },
      { status: "inquiry", utm_campaign: null, invoice_amount: null },
      { status: "inquiry", utm_campaign: "summer_promo", invoice_amount: null },
    ]);
    expect(summary.totalInquiries).toBe(3);
    expect(summary.unknown).toBe(2);
    expect(summary.bySlug).toHaveLength(1);
  });

  it("sorts by inquiry count desc so the page renders top-converter first", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_ren", invoice_amount: null },
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: null },
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: null },
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: null },
      { status: "inquiry", utm_campaign: "character_ren", invoice_amount: null },
    ]);
    expect(summary.bySlug.map((b) => b.slug)).toEqual(["yuna", "ren"]);
  });

  it("0-inquiry input returns empty buckets, not crashes", () => {
    const summary = summarizeCharacterAttribution([]);
    expect(summary.totalInquiries).toBe(0);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.bySlug).toHaveLength(0);
    expect(summary.byTier).toHaveLength(0);
    expect(summary.unknown).toBe(0);
  });

  it("splits brand-kit tier campaigns into byTier (not bySlug)", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "brand_kit_paired", invoice_amount: null },
      { status: "delivered", utm_campaign: "brand_kit_paired", invoice_amount: 11_000_000 },
      { status: "inquiry", utm_campaign: "brand_kit_season", invoice_amount: null },
      { status: "inquiry", utm_campaign: "character_yuna", invoice_amount: null },
    ]);
    expect(summary.byTier).toHaveLength(2);
    expect(summary.byTier[0]).toEqual({
      tier: "paired",
      inquiries: 2,
      delivered: 1,
      revenue: 11_000_000,
      conversionPct: 50,
    });
    expect(summary.bySlug).toHaveLength(1);
    expect(summary.bySlug[0].slug).toBe("yuna");
    expect(summary.unknown).toBe(0);
  });
});
