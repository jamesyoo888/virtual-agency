import { describe, it, expect } from "vitest";
import {
  CHARACTERS,
  getCharacter,
  listCharacters,
} from "@/lib/characters/registry";

describe("character registry", () => {
  it("exports the Yuna + Ren character pair (decision-queue #5: 2 characters)", () => {
    const slugs = CHARACTERS.map((c) => c.slug);
    expect(slugs).toContain("yuna");
    expect(slugs).toContain("ren");
    expect(CHARACTERS).toHaveLength(2);
  });

  it("getCharacter returns the matching record or undefined", () => {
    expect(getCharacter("yuna")?.name).toBe("Yuna");
    expect(getCharacter("ren")?.name).toBe("Ren");
    expect(getCharacter("missing")).toBeUndefined();
  });

  it("listCharacters returns all characters in stable order", () => {
    const list = listCharacters();
    expect(list).toHaveLength(2);
    expect(list[0].slug).toBe("yuna");
    expect(list[1].slug).toBe("ren");
  });

  it("each character has the full brand-bible shape", () => {
    for (const c of CHARACTERS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.tagline.length).toBeGreaterThan(0);
      expect(c.lore.length).toBeGreaterThan(50); // not a placeholder
      expect(c.age).toBeGreaterThan(0);
      expect(c.aesthetic.lighting.length).toBeGreaterThan(0);
      expect(c.aesthetic.palette.length).toBeGreaterThan(0);
      expect(c.aesthetic.wardrobe.length).toBeGreaterThan(0);
      expect(c.targetVerticals.length).toBeGreaterThan(0);
      expect(c.defaultMoods.length).toBeGreaterThan(0);
    }
  });

  it("Yuna targets beauty + luxury + tech + lifestyle (K-aesthetic plan §1.1)", () => {
    const yuna = getCharacter("yuna");
    expect(yuna?.targetVerticals).toEqual(
      expect.arrayContaining(["beauty", "luxury", "tech", "lifestyle"])
    );
  });

  it("Ren targets luxury (fragrance/watches) — male K-pop visual register", () => {
    const ren = getCharacter("ren");
    expect(ren?.targetVerticals).toContain("luxury");
    expect(ren?.gender).toBe("male");
  });

  it("characters carry licensingNote so /en/character/[slug] CTA section renders", () => {
    for (const c of CHARACTERS) {
      expect(c.licensingNote.length).toBeGreaterThan(0);
    }
  });

  it("introducedAt is a 4-digit year (used in press copy)", () => {
    for (const c of CHARACTERS) {
      expect(c.introducedAt).toMatch(/^\d{4}$/);
    }
  });
});
