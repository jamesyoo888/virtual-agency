import { describe, it, expect } from "vitest";
import {
  GLOSSARY_CATEGORY_OG_THEME,
  getGlossaryCategoryOgTheme,
  isGlossaryCategory,
} from "@/lib/glossary/category-og-theme";
import {
  GLOSSARY_CATEGORY_ORDER,
  type GlossaryCategory,
} from "@/lib/glossary/terms";

describe("glossary category OG theme registry", () => {
  it("every category in GLOSSARY_CATEGORY_ORDER has a registered theme — adding a category without a theme should fail this assertion", () => {
    for (const category of GLOSSARY_CATEGORY_ORDER) {
      expect(
        getGlossaryCategoryOgTheme(category),
        `category "${category}" is missing from GLOSSARY_CATEGORY_OG_THEME`
      ).toBeDefined();
    }
  });

  it("each theme has the four required fields", () => {
    for (const [id, theme] of Object.entries(GLOSSARY_CATEGORY_OG_THEME)) {
      expect(theme.gradient, `${id} gradient`).toMatch(/linear-gradient/);
      expect(theme.accent, `${id} accent`).toMatch(/^#[0-9a-f]{3,8}$/i);
      expect(theme.chipBg, `${id} chipBg`).toMatch(/rgba?\(/);
      expect(theme.chipBorder, `${id} chipBorder`).toMatch(/rgba?\(/);
    }
  });

  it("accent colors are distinct across all 5 categories (visual difference matters for shared OG previews)", () => {
    const accents = new Set(
      Object.values(GLOSSARY_CATEGORY_OG_THEME).map((t) => t.accent)
    );
    expect(accents.size).toBe(5);
  });

  it("isGlossaryCategory accepts every registered category", () => {
    const categories: GlossaryCategory[] = [
      "visual",
      "commercial",
      "compliance",
      "workflow",
      "product",
    ];
    for (const c of categories) {
      expect(isGlossaryCategory(c)).toBe(true);
    }
  });

  it("isGlossaryCategory rejects null, empty, and unknown values", () => {
    expect(isGlossaryCategory(null)).toBe(false);
    expect(isGlossaryCategory("")).toBe(false);
    expect(isGlossaryCategory("bogus")).toBe(false);
    expect(isGlossaryCategory("WORKFLOW")).toBe(false);
  });
});
