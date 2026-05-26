import { describe, it, expect } from "vitest";
import { characterPersonLd } from "@/lib/seo/json-ld";
import { CHARACTERS, getCharacter } from "@/lib/characters/registry";

describe("characterPersonLd", () => {
  it("emits a valid schema.org Person node for Yuna", () => {
    const yuna = getCharacter("yuna")!;
    const ld = characterPersonLd(yuna);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Person");
    expect(ld.name).toBe("Yuna");
    expect(ld["@id"]).toMatch(/\/en\/character\/yuna$/);
  });

  it("flags synthetic nature in disambiguatingDescription so crawlers cannot mistake it for a real person", () => {
    const yuna = getCharacter("yuna")!;
    const ld = characterPersonLd(yuna);
    expect(ld.disambiguatingDescription).toMatch(/Fictional|synthetic|AI-generated/i);
  });

  it("omits birthDate and birthPlace to avoid implying a real person", () => {
    const ren = getCharacter("ren")!;
    const ld = characterPersonLd(ren);
    expect((ld as Record<string, unknown>).birthDate).toBeUndefined();
    expect((ld as Record<string, unknown>).birthPlace).toBeUndefined();
  });

  it("includes target verticals + moods in knowsAbout for LLM topic match", () => {
    const yuna = getCharacter("yuna")!;
    const ld = characterPersonLd(yuna);
    expect(ld.knowsAbout).toEqual(expect.arrayContaining(["beauty", "luxury"]));
    expect(ld.knowsAbout).toContain("K-aesthetic");
  });

  it("emits image array pointing at the OG card", () => {
    const ren = getCharacter("ren")!;
    const ld = characterPersonLd(ren);
    expect(Array.isArray(ld.image)).toBe(true);
    expect(ld.image[0]).toMatch(/en_character=ren/);
  });

  it("marks additionalType=Service so the persona is also a licensable production asset", () => {
    const yuna = getCharacter("yuna")!;
    const ld = characterPersonLd(yuna);
    expect(ld.additionalType).toMatch(/Service/);
  });

  it("affiliation points to Virtual Agency", () => {
    const ren = getCharacter("ren")!;
    const ld = characterPersonLd(ren);
    expect(ld.affiliation["@type"]).toBe("Organization");
    expect(ld.affiliation.name).toBe("Virtual Agency");
  });

  it("description merges persona + lore, capped at 600 chars", () => {
    const yuna = getCharacter("yuna")!;
    const ld = characterPersonLd(yuna);
    expect(typeof ld.description).toBe("string");
    expect(ld.description.length).toBeLessThanOrEqual(600);
    expect(ld.description.length).toBeGreaterThan(50);
  });

  it("renders cleanly for every character in the registry", () => {
    for (const c of CHARACTERS) {
      const ld = characterPersonLd(c);
      expect(ld["@id"]).toMatch(new RegExp(`/${c.slug}$`));
      expect(ld.name).toBe(c.name);
    }
  });

  it("sameAs is undefined when instagram is null (no fabricated handles)", () => {
    const yuna = getCharacter("yuna")!;
    const ld = characterPersonLd(yuna);
    // Yuna has instagram: null in registry — sameAs should be omitted.
    expect((ld as Record<string, unknown>).sameAs).toBeUndefined();
  });
});
