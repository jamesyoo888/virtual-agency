import { describe, it, expect } from "vitest";
import {
  CHARACTER_CONTEXT_SLUGS,
  hasCharacterContext,
} from "@/lib/glossary/character-context";
import { GLOSSARY_TERMS } from "@/lib/glossary/terms";

describe("glossary character-context flag", () => {
  it("flags exactly the commercial-mechanic terms (brand-kit · exclusivity · styling-dna)", () => {
    expect(CHARACTER_CONTEXT_SLUGS.has("brand-kit")).toBe(true);
    expect(CHARACTER_CONTEXT_SLUGS.has("category-exclusivity")).toBe(true);
    expect(CHARACTER_CONTEXT_SLUGS.has("styling-dna")).toBe(true);
  });

  it("does NOT flag pure-definition terms (k-aesthetic / glass-skin / rfp)", () => {
    expect(hasCharacterContext("k-aesthetic")).toBe(false);
    expect(hasCharacterContext("glass-skin")).toBe(false);
    expect(hasCharacterContext("rfp")).toBe(false);
  });

  it("every flagged slug actually exists in the glossary registry", () => {
    const registrySlugs = new Set(GLOSSARY_TERMS.map((t) => t.slug));
    for (const slug of CHARACTER_CONTEXT_SLUGS) {
      expect(registrySlugs.has(slug)).toBe(true);
    }
  });
});
