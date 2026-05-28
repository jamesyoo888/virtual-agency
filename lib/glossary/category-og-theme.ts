import type { GlossaryCategory } from "@/lib/glossary/terms";

/**
 * Per-category OG card theming — separate accent + gradient per glossary
 * category so social previews shared from /glossary?category=X are visually
 * distinguishable. Symmetric with `lib/blog/series-og-theme.ts`.
 *
 * Pinned colors (not Tailwind classnames) because the OG renderer uses
 * inline styles inside `next/og` and Tailwind doesn't resolve there.
 */
export interface GlossaryCategoryOgTheme {
  gradient: string;
  accent: string;
  chipBg: string;
  chipBorder: string;
}

export const GLOSSARY_CATEGORY_OG_THEME: Record<
  GlossaryCategory,
  GlossaryCategoryOgTheme
> = {
  visual: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 100%)",
    accent: "#a5b4fc",
    chipBg: "rgba(99, 102, 241, 0.18)",
    chipBorder: "rgba(165, 180, 252, 0.45)",
  },
  commercial: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #064e3b 100%)",
    accent: "#6ee7b7",
    chipBg: "rgba(16, 185, 129, 0.18)",
    chipBorder: "rgba(110, 231, 183, 0.45)",
  },
  compliance: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #4c0519 100%)",
    accent: "#fda4af",
    chipBg: "rgba(244, 63, 94, 0.18)",
    chipBorder: "rgba(253, 164, 175, 0.45)",
  },
  workflow: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #422006 100%)",
    accent: "#fcd34d",
    chipBg: "rgba(245, 158, 11, 0.18)",
    chipBorder: "rgba(252, 211, 77, 0.45)",
  },
  product: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #3b0764 100%)",
    accent: "#c4b5fd",
    chipBg: "rgba(139, 92, 246, 0.18)",
    chipBorder: "rgba(196, 181, 253, 0.45)",
  },
};

export function getGlossaryCategoryOgTheme(
  category: GlossaryCategory
): GlossaryCategoryOgTheme {
  return GLOSSARY_CATEGORY_OG_THEME[category];
}

export function isGlossaryCategory(
  s: string | null | undefined
): s is GlossaryCategory {
  return (
    s === "visual" ||
    s === "commercial" ||
    s === "compliance" ||
    s === "workflow" ||
    s === "product"
  );
}
