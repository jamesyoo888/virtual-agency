import { describe, it, expect } from "vitest";
import { GLOSSARY_TERMS, getTerm } from "@/lib/glossary/terms";
import { definedTermSetLd } from "@/lib/seo/json-ld";

describe("glossary registry", () => {
  it("exports the K-aesthetic / synthetic-talent vocabulary (>= 14 terms, grows over time)", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(14);
  });

  it("every term has KR + EN entries with definitions ≥ 30 chars", () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.ko.term.length).toBeGreaterThan(0);
      expect(t.en.term.length).toBeGreaterThan(0);
      expect(t.ko.definition.length).toBeGreaterThanOrEqual(30);
      expect(t.en.definition.length).toBeGreaterThanOrEqual(30);
    }
  });

  it("slugs are URL-safe and unique (anchor links + JSON-LD identifiers)", () => {
    const slugs = new Set<string>();
    for (const t of GLOSSARY_TERMS) {
      expect(t.slug).toMatch(/^[a-z0-9-]+$/);
      expect(slugs.has(t.slug)).toBe(false);
      slugs.add(t.slug);
    }
  });

  it("getTerm resolves by slug", () => {
    expect(getTerm("k-aesthetic")?.ko.term).toBe("K-aesthetic");
    expect(getTerm("glass-skin")?.en.term).toBe("Glass skin");
    expect(getTerm("missing")).toBeUndefined();
  });

  it("core K-aesthetic vocabulary is present (LLM citation candidates)", () => {
    const slugs = GLOSSARY_TERMS.map((t) => t.slug);
    expect(slugs).toContain("k-aesthetic");
    expect(slugs).toContain("synthetic-talent");
    expect(slugs).toContain("brand-kit");
    expect(slugs).toContain("category-exclusivity");
    expect(slugs).toContain("disclosure-metadata");
    expect(slugs).toContain("styling-dna");
    expect(slugs).toContain("ai-disclosure");
  });

  it("relatedPostSlug points to a blog post that surfaces the term", () => {
    // Cross-link integrity is loose by design — only some terms have a
    // related post. Verify at least 5 terms link so the cross-promotion
    // surface is real.
    const linked = GLOSSARY_TERMS.filter((t) => t.relatedPostSlug);
    expect(linked.length).toBeGreaterThanOrEqual(5);
  });

  it("relatedPostSlugKo (KR override) resolves to a real KR-locale post", async () => {
    const { getPostBySlug } = await import("@/lib/blog/posts");
    const overrides = GLOSSARY_TERMS.filter((t) => t.relatedPostSlugKo);
    expect(overrides.length).toBeGreaterThanOrEqual(2);
    for (const t of overrides) {
      const post = getPostBySlug(t.relatedPostSlugKo!, "ko");
      expect(post, `KR override for ${t.slug} should resolve`).toBeDefined();
    }
  });
});

describe("definedTermSetLd emits valid schema.org DefinedTermSet", () => {
  it("returns @type=DefinedTermSet with hasDefinedTerm array", () => {
    const ld = definedTermSetLd("Test set", [
      {
        url: "https://example.com/glossary#a",
        term: "A",
        description: "Definition of A",
      },
      {
        url: "https://example.com/glossary#b",
        term: "B",
        description: "Definition of B",
      },
    ]);
    expect(ld["@type"]).toBe("DefinedTermSet");
    expect(ld.name).toBe("Test set");
    expect(ld.hasDefinedTerm).toHaveLength(2);
    expect(ld.hasDefinedTerm[0]["@type"]).toBe("DefinedTerm");
    expect(ld.hasDefinedTerm[0]["@id"]).toBe("https://example.com/glossary#a");
    expect(ld.hasDefinedTerm[0].name).toBe("A");
  });

  it("handles empty entries (no terms ever ships clean)", () => {
    const ld = definedTermSetLd("Empty", []);
    expect(ld.hasDefinedTerm).toHaveLength(0);
  });
});
