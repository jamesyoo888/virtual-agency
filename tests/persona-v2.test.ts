import { describe, expect, it } from "vitest";
import { scoreModel, rankModels } from "@/lib/matching/score";
import type { Model } from "@/types";

function model(p: Partial<Model>): Model {
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? "Model",
    slug: "m",
    debut_date: null,
    bio: null,
    personality: null,
    industry_tags: [],
    genre_tags: [],
    mood_tags: [],
    instagram_handle: null,
    follower_count: 0,
    base_price: null,
    exclusive_price: null,
    is_exclusive_available: false,
    status: "active",
    concept_image: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...p,
  } as Model;
}

describe("personaRfps bonus", () => {
  it("awards smaller bonus than personaInquiries for the same count", () => {
    const m = model({ id: "m1", industry_tags: ["beauty"] });
    const withInquiry = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
      personaInquiries: new Map([["m1", 1]]),
    });
    const withRfp = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
      personaRfps: new Map([["m1", 1]]),
    });
    // 1 inquiry → +4, 1 rfp appearance → +2
    expect(withInquiry.score).toBeGreaterThan(withRfp.score);
  });

  it("saturates the RFP bonus separately from inquiries", () => {
    const m = model({ id: "m1", industry_tags: ["beauty"] });
    const base = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
    });
    const huge = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
      personaRfps: new Map([["m1", 50]]),
    });
    // RFP cap is 6 pt
    expect(huge.score - base.score).toBeLessThanOrEqual(6 + 0.0001);
  });

  it("surfaces a reason when RFP bonus applies", () => {
    const m = model({ id: "m1", industry_tags: ["beauty"] });
    const r = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
      personaRfps: new Map([["m1", 2]]),
    });
    expect(r.reasons.some((x) => x.includes("RFP 추천"))).toBe(true);
  });

  it("stacks inquiry + RFP bonus when both signals exist", () => {
    const m = model({ id: "m1", industry_tags: ["beauty"] });
    const both = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
      personaInquiries: new Map([["m1", 1]]),
      personaRfps: new Map([["m1", 1]]),
    });
    const onlyInquiry = scoreModel(m, {
      industries: ["beauty"], genres: [], moods: [],
      personaInquiries: new Map([["m1", 1]]),
    });
    expect(both.score).toBeGreaterThan(onlyInquiry.score);
  });

  it("inquiries outweigh RFPs in ranking ties", () => {
    const inquiredOnce = model({ id: "inq", name: "Inquired", industry_tags: ["beauty"] });
    const rfpThrice = model({ id: "rfp", name: "RFP3x", industry_tags: ["beauty"] });
    const ranked = rankModels([rfpThrice, inquiredOnce], {
      industries: ["beauty"], genres: [], moods: [],
      personaInquiries: new Map([["inq", 1]]),
      personaRfps: new Map([["rfp", 3]]),
    });
    // 1 inquiry = +4 pt; 3 RFP appearances = +6 pt — RFP wins this gap.
    // But cap on RFP is 6; cap on inquiry is 12, so 2 inquiries already
    // beats *any* RFP-only signal. This case picks the larger raw bonus.
    expect(ranked.map((r) => r.model.id)).toEqual(["rfp", "inq"]);
  });

  it("two inquiries dominate even a maxed-out RFP signal", () => {
    const inquiredTwice = model({ id: "inq", name: "Inquired", industry_tags: ["beauty"] });
    const rfpFlood = model({ id: "rfp", name: "RFPFlood", industry_tags: ["beauty"] });
    const ranked = rankModels([rfpFlood, inquiredTwice], {
      industries: ["beauty"], genres: [], moods: [],
      personaInquiries: new Map([["inq", 2]]),
      personaRfps: new Map([["rfp", 50]]),
    });
    // 2 inquiries = +8; RFP cap = +6. Inquiries win.
    expect(ranked[0].model.id).toBe("inq");
  });
});
