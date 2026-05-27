import { describe, it, expect } from "vitest";
import {
  parseSlugFromCampaign,
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

describe("summarizeCharacterAttribution", () => {
  it("buckets rows by slug with delivered + conversion", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_yuna" },
      { status: "delivered", utm_campaign: "character_yuna" },
      { status: "inquiry", utm_campaign: "character_ren" },
      { status: "delivered", utm_campaign: "character_yuna" },
    ]);
    expect(summary.totalInquiries).toBe(4);
    expect(summary.totalDelivered).toBe(2);
    expect(summary.bySlug[0]).toEqual({
      slug: "yuna",
      inquiries: 3,
      delivered: 2,
      conversionPct: 67,
    });
    expect(summary.bySlug[1]).toEqual({
      slug: "ren",
      inquiries: 1,
      delivered: 0,
      conversionPct: 0,
    });
    expect(summary.unknown).toBe(0);
  });

  it("counts unparseable utm_campaign rows as unknown without skewing totals", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_yuna" },
      { status: "inquiry", utm_campaign: null },
      { status: "inquiry", utm_campaign: "summer_promo" },
    ]);
    expect(summary.totalInquiries).toBe(3);
    expect(summary.unknown).toBe(2);
    expect(summary.bySlug).toHaveLength(1);
  });

  it("sorts by inquiry count desc so the page renders top-converter first", () => {
    const summary = summarizeCharacterAttribution([
      { status: "inquiry", utm_campaign: "character_ren" },
      { status: "inquiry", utm_campaign: "character_yuna" },
      { status: "inquiry", utm_campaign: "character_yuna" },
      { status: "inquiry", utm_campaign: "character_yuna" },
      { status: "inquiry", utm_campaign: "character_ren" },
    ]);
    expect(summary.bySlug.map((b) => b.slug)).toEqual(["yuna", "ren"]);
  });

  it("0-inquiry input returns empty buckets, not crashes", () => {
    const summary = summarizeCharacterAttribution([]);
    expect(summary.totalInquiries).toBe(0);
    expect(summary.bySlug).toHaveLength(0);
    expect(summary.unknown).toBe(0);
  });
});
