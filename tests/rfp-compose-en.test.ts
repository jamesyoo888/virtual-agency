import { describe, it, expect } from "vitest";

import { composeRfpBriefEn, budgetBandToRangeEn } from "@/lib/rfp/compose";

describe("composeRfpBriefEn", () => {
  it("starts with the English RFP marker so global admin operators can spot the origin", () => {
    const out = composeRfpBriefEn({ campaign: "2026 FW" });
    expect(out.startsWith("[Recommended via RFP]")).toBe(true);
  });

  it("only includes lines for fields that were filled in", () => {
    const out = composeRfpBriefEn({ campaign: "Spring drop" });
    expect(out).toContain("Campaign: Spring drop");
    expect(out).not.toContain("Brand");
    expect(out).not.toContain("Target");
    expect(out).not.toContain("Schedule");
  });

  it("translates known channel codes to their English labels", () => {
    const out = composeRfpBriefEn({
      channels: ["tvc", "digital", "unknown_code"],
    });
    expect(out).toMatch(/Channels: TV commercial, Digital \/ social, unknown_code/);
  });

  it("merges launch date and duration into a single Schedule line", () => {
    const out = composeRfpBriefEn({ launch: "2026-07-01", durationDays: "14" });
    expect(out).toMatch(/Schedule: Launch 2026-07-01, 14 day run/);
  });

  it("notes exclusive license when requested and formats day rate in USD", () => {
    const out = composeRfpBriefEn({ needsExclusive: true, budgetPerDay: 600 });
    expect(out).toContain("Exclusive licensing requested");
    expect(out).toContain("Day rate up to $600");
  });

  it("uses USD budget bands (under_5k / 5k_15k / 15k_50k / over_50k)", () => {
    const out = composeRfpBriefEn({ budgetBand: "5k_15k" });
    expect(out).toContain("Total budget $5,000 – $15,000");
  });

  it("includes the message and hero copy on their own labelled blocks", () => {
    const out = composeRfpBriefEn({
      message: "Glass-skin glow for global Korean beauty",
      heroCopy: "Seoul, restored.",
    });
    expect(out).toContain("Key message\nGlass-skin glow for global Korean beauty");
    expect(out).toContain("Hero copy\nSeoul, restored.");
  });

  it("collapses to just the marker when no fields are filled", () => {
    expect(composeRfpBriefEn({})).toBe("[Recommended via RFP]");
  });

  it("uses English industry labels (Beauty, Tech, ...) not Korean", () => {
    const out = composeRfpBriefEn({ industries: ["beauty", "luxury"] });
    expect(out).toContain("Industry: Beauty, Luxury");
    expect(out).not.toContain("뷰티");
  });

  it("uses English mood labels (Cool, Warm, ...) not Korean", () => {
    const out = composeRfpBriefEn({ moods: ["cold", "edgy"] });
    expect(out).toContain("Mood: Cool, Edgy");
    expect(out).not.toContain("차가운");
  });
});

describe("budgetBandToRangeEn", () => {
  it("returns known USD bands verbatim", () => {
    expect(budgetBandToRangeEn("under_5k")).toBe("under_5k");
    expect(budgetBandToRangeEn("over_50k")).toBe("over_50k");
    expect(budgetBandToRangeEn("5k_15k")).toBe("5k_15k");
  });

  it("rejects KRW band identifiers (they are not valid USD bands)", () => {
    // KRW bands (under_500, 500_1000, ...) must NOT be treated as valid USD bands.
    expect(budgetBandToRangeEn("under_500")).toBe("");
    expect(budgetBandToRangeEn("over_3000")).toBe("");
  });

  it("falls back to empty for unknown / missing bands", () => {
    expect(budgetBandToRangeEn(undefined)).toBe("");
    expect(budgetBandToRangeEn("")).toBe("");
    expect(budgetBandToRangeEn("nope")).toBe("");
  });
});
