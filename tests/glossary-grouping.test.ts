import { describe, it, expect } from "vitest";
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORY_ORDER,
  GLOSSARY_CATEGORY_LABELS,
  groupByCategory,
  type GlossaryCategory,
} from "@/lib/glossary/terms";

describe("glossary category metadata", () => {
  it("every term has a category that's in the canonical order", () => {
    const valid = new Set<GlossaryCategory>(GLOSSARY_CATEGORY_ORDER);
    for (const t of GLOSSARY_TERMS) {
      expect(valid.has(t.category)).toBe(true);
    }
  });

  it("groupByCategory respects GLOSSARY_CATEGORY_ORDER", () => {
    const groups = groupByCategory();
    const order = groups.map((g) => g.category);
    // Must be a subsequence of GLOSSARY_CATEGORY_ORDER (empty buckets dropped)
    let last = -1;
    for (const cat of order) {
      const idx = GLOSSARY_CATEGORY_ORDER.indexOf(cat);
      expect(idx).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("every category referenced by a term shows up in groupByCategory output", () => {
    const used = new Set(GLOSSARY_TERMS.map((t) => t.category));
    const grouped = new Set(groupByCategory().map((g) => g.category));
    for (const cat of used) {
      expect(grouped.has(cat)).toBe(true);
    }
  });

  it("category labels exist for every canonical category, KR + EN", () => {
    for (const cat of GLOSSARY_CATEGORY_ORDER) {
      expect(GLOSSARY_CATEGORY_LABELS[cat].ko.length).toBeGreaterThan(0);
      expect(GLOSSARY_CATEGORY_LABELS[cat].en.length).toBeGreaterThan(0);
    }
  });

  it("commercial bucket includes the brand-kit + exclusivity terms", () => {
    const commercial = GLOSSARY_TERMS.filter((t) => t.category === "commercial")
      .map((t) => t.slug);
    expect(commercial).toContain("brand-kit");
    expect(commercial).toContain("category-exclusivity");
    expect(commercial).toContain("exclusive-campaign");
  });

  it("compliance bucket captures disclosure-related terms", () => {
    const compliance = GLOSSARY_TERMS.filter((t) => t.category === "compliance")
      .map((t) => t.slug);
    expect(compliance).toContain("disclosure-metadata");
    expect(compliance).toContain("ai-disclosure");
  });
});
