import { describe, it, expect } from "vitest";
import {
  parsePathFromCampaign,
  summarizePricingCalculatorAttribution,
  pathLabelForAdmin,
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
