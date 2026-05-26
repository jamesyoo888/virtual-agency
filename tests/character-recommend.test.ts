import { describe, it, expect } from "vitest";
import { recommendCharacters } from "@/lib/characters/recommend";

describe("recommendCharacters", () => {
  it("returns empty array when no industries or moods overlap", () => {
    expect(
      recommendCharacters({
        industries: ["construction"],
        moods: ["pastel"],
      })
    ).toEqual([]);
  });

  it("returns empty array when both lists are empty", () => {
    expect(recommendCharacters({ industries: [], moods: [] })).toEqual([]);
  });

  it("matches Yuna on a beauty + cold brief (her primary register)", () => {
    const matches = recommendCharacters({
      industries: ["beauty"],
      moods: ["cold"],
    });
    expect(matches[0].character.slug).toBe("yuna");
    expect(matches[0].score).toBeGreaterThan(0);
  });

  it("matches Ren on a luxury + edgy brief (his primary register)", () => {
    const matches = recommendCharacters({
      industries: ["luxury"],
      moods: ["edgy"],
    });
    const ren = matches.find((m) => m.character.slug === "ren");
    expect(ren).toBeDefined();
    expect(ren!.score).toBeGreaterThan(0);
  });

  it("weighs vertical hits 2x mood hits (luxury+cold should rank both characters; verticals dominate)", () => {
    // luxury is in both targetVerticals; cold is in both defaultMoods.
    const matches = recommendCharacters({
      industries: ["luxury"],
      moods: ["cold"],
    });
    expect(matches).toHaveLength(2);
    // Each character: 1 vertical hit (×2) + 1 mood hit (×1) = 3 points.
    expect(matches[0].score).toBe(3);
    expect(matches[1].score).toBe(3);
  });

  it("excludes zero-score characters", () => {
    const matches = recommendCharacters({
      industries: ["beauty"], // matches Yuna only
      moods: [],
    });
    const slugs = matches.map((m) => m.character.slug);
    expect(slugs).toContain("yuna");
    expect(slugs).not.toContain("ren");
  });

  it("sorts by descending score", () => {
    // Yuna gets beauty (×2) + cold (×1) = 3.
    // Ren gets just luxury — wait, no luxury in input. Ren scores 0 here.
    // So Yuna leads alone. Build a case where both score but unevenly:
    // Yuna: beauty + tech + lifestyle hit = 3 vertical hits × 2 = 6, no moods.
    // Ren: tech hit × 2 = 2, no moods.
    const matches = recommendCharacters({
      industries: ["beauty", "tech", "lifestyle"],
      moods: [],
    });
    expect(matches[0].character.slug).toBe("yuna");
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it("accepts arbitrary strings without crashing (type-tolerant signature)", () => {
    // The match pages pass through IndustryTag[] / MoodTag[]; we want the
    // helper to also tolerate raw `string[]` so callers do not need a cast.
    expect(() =>
      recommendCharacters({
        industries: ["beauty", "made-up"],
        moods: ["cold", "phantom-mood"],
      })
    ).not.toThrow();
  });
});
