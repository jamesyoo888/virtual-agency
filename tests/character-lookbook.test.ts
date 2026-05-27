import { describe, it, expect } from "vitest";
import {
  LOOKBOOK_CONCEPTS,
  lookbookForCharacter,
  conceptFrameSlots,
  conceptRenderedCount,
  type ConceptSheet,
} from "@/lib/characters/lookbook";
import { listCharacters } from "@/lib/characters/registry";

describe("character lookbook stub", () => {
  it("provides at least 3 concept sheets for every registered character", () => {
    for (const c of listCharacters()) {
      const concepts = lookbookForCharacter(c.slug);
      expect(
        concepts.length,
        `character ${c.slug} has fewer than 3 lookbook concepts`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("every concept declares mood / wardrobe / lighting + shot counts", () => {
    for (const slug of Object.keys(LOOKBOOK_CONCEPTS) as Array<
      keyof typeof LOOKBOOK_CONCEPTS
    >) {
      for (const c of LOOKBOOK_CONCEPTS[slug]) {
        expect(c.mood.length, `${slug}/${c.id} mood`).toBeGreaterThan(0);
        expect(c.wardrobeKo.length).toBeGreaterThan(0);
        expect(c.wardrobeEn.length).toBeGreaterThan(0);
        expect(c.lighting.length).toBeGreaterThan(0);
        expect(c.heroShots).toBeGreaterThan(0);
        expect(c.supportingShots).toBeGreaterThan(0);
      }
    }
  });

  it("concept ids are unique within a character", () => {
    for (const slug of Object.keys(LOOKBOOK_CONCEPTS) as Array<
      keyof typeof LOOKBOOK_CONCEPTS
    >) {
      const ids = LOOKBOOK_CONCEPTS[slug].map((c) => c.id);
      expect(new Set(ids).size, `${slug} duplicate ids`).toBe(ids.length);
    }
  });

  it("KR + EN titles and briefs are both populated (bilingual delivery)", () => {
    for (const slug of Object.keys(LOOKBOOK_CONCEPTS) as Array<
      keyof typeof LOOKBOOK_CONCEPTS
    >) {
      for (const c of LOOKBOOK_CONCEPTS[slug]) {
        expect(c.titleKo).toMatch(/.+/);
        expect(c.titleEn).toMatch(/.+/);
        expect(c.briefKo).toMatch(/.+/);
        expect(c.briefEn).toMatch(/.+/);
      }
    }
  });
});

describe("conceptFrameSlots + conceptRenderedCount (asset wiring scaffold)", () => {
  const baseSheet: ConceptSheet = {
    id: "test",
    titleKo: "테스트",
    titleEn: "Test",
    briefKo: "k",
    briefEn: "e",
    mood: ["x"],
    wardrobeKo: "k",
    wardrobeEn: "e",
    lighting: "l",
    heroShots: 2,
    supportingShots: 3,
  };

  it("returns null-padded slots when imageUrls is unset", () => {
    const slots = conceptFrameSlots(baseSheet);
    expect(slots).toHaveLength(5);
    expect(slots.every((s) => s.url === null)).toBe(true);
    expect(slots.slice(0, 2).every((s) => s.role === "hero")).toBe(true);
    expect(slots.slice(2).every((s) => s.role === "supporting")).toBe(true);
    expect(conceptRenderedCount(baseSheet)).toBe(0);
  });

  it("threads concrete urls into the first hero slots, then supporting", () => {
    const sheet: ConceptSheet = {
      ...baseSheet,
      imageUrls: [
        "https://cdn/hero-1.jpg",
        "https://cdn/hero-2.jpg",
        "https://cdn/supp-1.jpg",
      ],
    };
    const slots = conceptFrameSlots(sheet);
    expect(slots[0]).toEqual({ url: "https://cdn/hero-1.jpg", role: "hero" });
    expect(slots[1]).toEqual({ url: "https://cdn/hero-2.jpg", role: "hero" });
    expect(slots[2]).toEqual({
      url: "https://cdn/supp-1.jpg",
      role: "supporting",
    });
    expect(slots[3]).toEqual({ url: null, role: "supporting" });
    expect(slots[4]).toEqual({ url: null, role: "supporting" });
    expect(conceptRenderedCount(sheet)).toBe(3);
  });

  it("ignores empty-string urls when counting rendered frames", () => {
    const sheet: ConceptSheet = {
      ...baseSheet,
      imageUrls: ["", "https://cdn/h.jpg", ""],
    };
    // After filter: 1 rendered, slotted into the first hero position.
    expect(conceptRenderedCount(sheet)).toBe(1);
    const slots = conceptFrameSlots(sheet);
    expect(slots[0].url).toBe("https://cdn/h.jpg");
    expect(slots.slice(1).every((s) => s.url === null)).toBe(true);
  });
});
