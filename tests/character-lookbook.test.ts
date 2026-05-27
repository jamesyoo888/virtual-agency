import { describe, it, expect } from "vitest";
import {
  LOOKBOOK_CONCEPTS,
  lookbookForCharacter,
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
