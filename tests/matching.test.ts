import { describe, expect, it } from "vitest";
import { extractTagsFromText, rankModels, scoreModel } from "@/lib/matching/score";
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

describe("extractTagsFromText", () => {
  it("picks korean labels from a freeform brief", () => {
    const out = extractTagsFromText("럭셔리 뷰티 브랜드 광고, 차가운 분위기");
    expect(out.industries).toContain("luxury");
    expect(out.industries).toContain("beauty");
    expect(out.genres).toContain("ad");
    expect(out.moods).toContain("cold");
  });

  it("picks english enum values too", () => {
    const out = extractTagsFromText("tech ad with warm mood");
    expect(out.industries).toContain("tech");
    expect(out.genres).toContain("ad");
    expect(out.moods).toContain("warm");
  });

  it("returns empty arrays for irrelevant text", () => {
    const out = extractTagsFromText("hello world");
    expect(out.industries).toEqual([]);
    expect(out.genres).toEqual([]);
    expect(out.moods).toEqual([]);
  });

  it("respects English word boundaries (no biotech → tech)", () => {
    const out = extractTagsFromText("biotech roadshow");
    expect(out.industries).not.toContain("tech");
  });

  it("caps text length to avoid pathological inputs", () => {
    const long = "x".repeat(10_000) + " 럭셔리";
    const out = extractTagsFromText(long);
    // Even though the brief is huge, we shouldn't time out or crash.
    expect(Array.isArray(out.industries)).toBe(true);
  });
});

describe("scoreModel", () => {
  it("awards points only for actual matches", () => {
    const m = model({
      industry_tags: ["luxury"],
      genre_tags: ["ad"],
      mood_tags: ["cold"],
    });
    const r = scoreModel(m, {
      industries: ["luxury"],
      genres: ["ad"],
      moods: ["cold"],
    });
    // 35 + 25 + 20 = 80 minimum, plus possible popularity tiebreaker
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.reasons).toHaveLength(3);
  });

  it("adds bonus when budget covers the day rate", () => {
    const cheap = model({ base_price: 300_000 });
    const expensive = model({ base_price: 900_000 });
    const r1 = scoreModel(cheap, { industries: [], genres: [], moods: [], budgetPerDay: 1_000_000 });
    const r2 = scoreModel(expensive, { industries: [], genres: [], moods: [], budgetPerDay: 1_000_000 });
    expect(r1.score).toBeGreaterThan(r2.score);
  });

  it("acknowledges budget parity without the spurious +1pt of the old impl", () => {
    const m = model({ base_price: 1_000_000 });
    const r = scoreModel(m, { industries: [], genres: [], moods: [], budgetPerDay: 1_000_000 });
    // base_price === budget → ratio=1 → bonus=0 → falls into "예산 한도 내" (+1)
    expect(r.reasons).toContain("예산 한도 내");
  });

  it("rewards exclusive availability when requested", () => {
    const exclusive = model({ is_exclusive_available: true });
    const nonExclusive = model({ is_exclusive_available: false });
    const r1 = scoreModel(exclusive, { industries: [], genres: [], moods: [], needsExclusive: true });
    const r2 = scoreModel(nonExclusive, { industries: [], genres: [], moods: [], needsExclusive: true });
    expect(r1.score).toBeGreaterThan(r2.score);
  });
});

describe("rankModels", () => {
  it("drops zero-score models and sorts descending", () => {
    const a = model({ name: "A", industry_tags: ["luxury"], follower_count: 100 });
    const b = model({ name: "B", industry_tags: ["beauty"], follower_count: 100 });
    const noMatch = model({ name: "Z", industry_tags: ["tech"] });
    const ranked = rankModels([a, b, noMatch], {
      industries: ["luxury", "beauty"],
      genres: [],
      moods: [],
    });
    expect(ranked.map((r) => r.model.name)).toEqual(["A", "B"]);
  });
});

describe("persona bonus", () => {
  it("adds points proportional to past inquiry count, capped", () => {
    const m = model({ id: "model-1", industry_tags: ["beauty"] });
    const noHistory = scoreModel(m, {
      industries: ["beauty"],
      genres: [],
      moods: [],
    });
    const oneInquiry = scoreModel(m, {
      industries: ["beauty"],
      genres: [],
      moods: [],
      personaInquiries: new Map([["model-1", 1]]),
    });
    const manyInquiries = scoreModel(m, {
      industries: ["beauty"],
      genres: [],
      moods: [],
      personaInquiries: new Map([["model-1", 50]]),
    });

    expect(oneInquiry.score).toBeGreaterThan(noHistory.score);
    expect(manyInquiries.score).toBeGreaterThan(oneInquiry.score);
    // Cap kicks in: 50 × 4 = 200, but the cap is 12.
    expect(manyInquiries.score - noHistory.score).toBeLessThanOrEqual(12 + 0.0001);
  });

  it("surfaces the past-collaboration reason when bonus applies", () => {
    const m = model({ id: "m1", industry_tags: ["beauty"] });
    const result = scoreModel(m, {
      industries: ["beauty"],
      genres: [],
      moods: [],
      personaInquiries: new Map([["m1", 2]]),
    });
    expect(result.reasons.some((r) => r.includes("이전 협업"))).toBe(true);
  });

  it("does not affect models the client hasn't worked with", () => {
    const m = model({ id: "stranger", industry_tags: ["beauty"] });
    const result = scoreModel(m, {
      industries: ["beauty"],
      genres: [],
      moods: [],
      personaInquiries: new Map([["someone-else", 3]]),
    });
    expect(result.reasons.some((r) => r.includes("이전 협업"))).toBe(false);
  });

  it("re-orders ranking when persona bonus exceeds a tag-fit gap", () => {
    // Big-fit model has more tag matches, but a small-fit model is a repeat
    // collaborator — they should both rank, persona-favored if bonus closes
    // the gap.
    const repeatPartner = model({
      id: "repeat",
      name: "Repeat",
      industry_tags: ["beauty"],
    });
    const newcomer = model({
      id: "newcomer",
      name: "Newcomer",
      industry_tags: ["beauty"],
      follower_count: 1, // small popularity tiebreak
    });
    const ranked = rankModels([newcomer, repeatPartner], {
      industries: ["beauty"],
      genres: [],
      moods: [],
      personaInquiries: new Map([["repeat", 3]]),
    });
    expect(ranked[0].model.name).toBe("Repeat");
  });
});
