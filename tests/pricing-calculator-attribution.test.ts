import { describe, it, expect } from "vitest";
import {
  parsePathFromCampaign,
  summarizePricingCalculatorAttribution,
  pathLabelForAdmin,
  aggregateWeeklyByPath,
} from "@/lib/analytics/pricing-calculator-attribution";

describe("parsePathFromCampaign", () => {
  it("accepts known RecommendedPath values", () => {
    expect(parsePathFromCampaign("license_daily")).toBe("license_daily");
    expect(parsePathFromCampaign("paired_editorial")).toBe("paired_editorial");
    expect(parsePathFromCampaign("season_anchor")).toBe("season_anchor");
    expect(parsePathFromCampaign("custom_build")).toBe("custom_build");
    expect(parsePathFromCampaign("traditional_competitive")).toBe(
      "traditional_competitive"
    );
  });

  it("rejects unknown values", () => {
    expect(parsePathFromCampaign(null)).toBeNull();
    expect(parsePathFromCampaign("")).toBeNull();
    expect(parsePathFromCampaign("license")).toBeNull();
    expect(parsePathFromCampaign("character_yuna")).toBeNull();
    expect(parsePathFromCampaign("LICENSE_DAILY")).toBeNull();
  });
});

describe("summarizePricingCalculatorAttribution", () => {
  it("aggregates inquiries by path with conversion and revenue", () => {
    const result = summarizePricingCalculatorAttribution([
      { status: "inquiry", utm_campaign: "license_daily" },
      {
        status: "delivered",
        utm_campaign: "paired_editorial",
        invoice_amount: 22_000_000,
      },
      {
        status: "delivered",
        utm_campaign: "paired_editorial",
        invoice_amount: 18_000_000,
      },
      { status: "in_progress", utm_campaign: "season_anchor" },
      { status: "inquiry", utm_campaign: "garbage" },
    ]);

    expect(result.totalInquiries).toBe(5);
    expect(result.totalDelivered).toBe(2);
    expect(result.totalRevenue).toBe(40_000_000);
    expect(result.unknown).toBe(1);

    const paired = result.byPath.find((p) => p.path === "paired_editorial");
    expect(paired).toBeDefined();
    expect(paired!.inquiries).toBe(2);
    expect(paired!.delivered).toBe(2);
    expect(paired!.conversionPct).toBe(100);
    expect(paired!.revenue).toBe(40_000_000);

    const license = result.byPath.find((p) => p.path === "license_daily");
    expect(license!.inquiries).toBe(1);
    expect(license!.delivered).toBe(0);
    expect(license!.conversionPct).toBe(0);
  });

  it("sorts paths by inquiry count desc", () => {
    const result = summarizePricingCalculatorAttribution([
      { status: "inquiry", utm_campaign: "license_daily" },
      { status: "inquiry", utm_campaign: "paired_editorial" },
      { status: "inquiry", utm_campaign: "paired_editorial" },
      { status: "inquiry", utm_campaign: "paired_editorial" },
      { status: "inquiry", utm_campaign: "season_anchor" },
      { status: "inquiry", utm_campaign: "season_anchor" },
    ]);
    expect(result.byPath.map((p) => p.path)).toEqual([
      "paired_editorial",
      "season_anchor",
      "license_daily",
    ]);
  });

  it("returns empty arrays for empty input", () => {
    const result = summarizePricingCalculatorAttribution([]);
    expect(result.totalInquiries).toBe(0);
    expect(result.byPath).toEqual([]);
    expect(result.unknown).toBe(0);
  });
});

describe("aggregateWeeklyByPath", () => {
  function rowsAt(date: string, count: number, campaign: string) {
    return Array.from({ length: count }, () => ({
      status: "inquiry",
      utm_campaign: campaign,
      created_at: `${date}T12:00:00.000Z`,
    }));
  }

  it("returns a contiguous weekly series (zero-filled) when no rows", () => {
    const weeks = aggregateWeeklyByPath([], 30);
    expect(weeks.length).toBeGreaterThanOrEqual(1);
    for (const w of weeks) {
      expect(w.total).toBe(0);
      expect(w.counts.license_daily).toBe(0);
      expect(w.counts.paired_editorial).toBe(0);
    }
  });

  it("tallies per-path counts into the right week", () => {
    // Use 90d window so we have multiple weeks to land rows into.
    const today = new Date();
    const recentISO = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const olderISO = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const weeks = aggregateWeeklyByPath(
      [
        ...rowsAt(recentISO, 3, "paired_editorial"),
        ...rowsAt(recentISO, 2, "license_daily"),
        ...rowsAt(olderISO, 1, "season_anchor"),
      ],
      90
    );
    const totalInquiries = weeks.reduce((sum, w) => sum + w.total, 0);
    expect(totalInquiries).toBe(6);
    const totalPaired = weeks.reduce(
      (sum, w) => sum + w.counts.paired_editorial,
      0
    );
    expect(totalPaired).toBe(3);
    const totalSeason = weeks.reduce(
      (sum, w) => sum + w.counts.season_anchor,
      0
    );
    expect(totalSeason).toBe(1);
  });

  it("uses Monday as week start (ISO YYYY-MM-DD)", () => {
    const weeks = aggregateWeeklyByPath([], 30);
    for (const w of weeks) {
      expect(w.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Day-of-week of weekStart must be Monday (1) in UTC.
      const d = new Date(`${w.weekStart}T00:00:00.000Z`);
      expect(d.getUTCDay()).toBe(1);
    }
  });

  it("treats unknown utm_campaign as total but not in any path bucket", () => {
    const today = new Date();
    const recentISO = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const weeks = aggregateWeeklyByPath(
      [
        ...rowsAt(recentISO, 2, "license_daily"),
        ...rowsAt(recentISO, 1, "garbage_path"),
      ],
      30
    );
    const total = weeks.reduce((sum, w) => sum + w.total, 0);
    const license = weeks.reduce((sum, w) => sum + w.counts.license_daily, 0);
    expect(total).toBe(3); // garbage row counted in total
    expect(license).toBe(2); // but only license tallied per-path
  });
});

describe("pathLabelForAdmin", () => {
  it("returns a short label and tone for each known path", () => {
    expect(pathLabelForAdmin("license_daily").tone).toBe("amber");
    expect(pathLabelForAdmin("paired_editorial").tone).toBe("emerald");
    expect(pathLabelForAdmin("season_anchor").tone).toBe("violet");
    expect(pathLabelForAdmin("custom_build").tone).toBe("fuchsia");
    expect(pathLabelForAdmin("traditional_competitive").tone).toBe("zinc");

    expect(pathLabelForAdmin("paired_editorial").short).toBe(
      "Paired Editorial"
    );
  });
});
