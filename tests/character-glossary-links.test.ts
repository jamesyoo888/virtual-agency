import { describe, it, expect } from "vitest";
import { glossaryForCharacter } from "@/lib/characters/glossary-links";
import { getCharacter } from "@/lib/characters/registry";

describe("glossaryForCharacter", () => {
  it("returns the always-on K-aesthetic vocabulary for every character", () => {
    const yuna = getCharacter("yuna")!;
    const slugs = glossaryForCharacter(yuna).map((t) => t.slug);
    expect(slugs).toContain("k-aesthetic");
    expect(slugs).toContain("styling-dna");
    expect(slugs).toContain("brand-kit");
    expect(slugs).toContain("category-exclusivity");
    expect(slugs).toContain("disclosure-metadata");
  });

  it("includes glass-skin only when the character's lighting recipe matches", () => {
    const yuna = getCharacter("yuna")!;
    const ren = getCharacter("ren")!;
    const yunaSlugs = glossaryForCharacter(yuna).map((t) => t.slug);
    const renSlugs = glossaryForCharacter(ren).map((t) => t.slug);
    expect(yunaSlugs).toContain("glass-skin");
    expect(renSlugs).not.toContain("glass-skin");
  });

  it("emits the curated order — K-aesthetic first, disclosure last", () => {
    const yuna = getCharacter("yuna")!;
    const slugs = glossaryForCharacter(yuna).map((t) => t.slug);
    expect(slugs[0]).toBe("k-aesthetic");
    expect(slugs[slugs.length - 1]).toBe("disclosure-metadata");
  });

  it("returns GlossaryTerm objects (KR + EN ready) — page picks the locale", () => {
    const yuna = getCharacter("yuna")!;
    const terms = glossaryForCharacter(yuna);
    for (const t of terms) {
      expect(t.ko.term.length).toBeGreaterThan(0);
      expect(t.en.term.length).toBeGreaterThan(0);
    }
  });
});
