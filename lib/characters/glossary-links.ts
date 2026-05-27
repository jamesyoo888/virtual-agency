/**
 * The glossary slugs that meaningfully describe a character on its detail page.
 *
 * Buyers landing on /character/{yuna,ren} often hit unfamiliar vocabulary
 * (glass-skin lighting, styling DNA, category exclusivity). The detail page
 * surfaces this short list so the reader can hop one click to a definition
 * instead of bouncing to Google. We pick from `GLOSSARY_TERMS` so the strings
 * stay authoritative.
 *
 * Order is curated: K-aesthetic first (root concept), then the visual cues
 * (glass-skin, styling-dna), then the commercial mechanics (brand-kit,
 * category-exclusivity, disclosure-metadata). Used by both KR + EN routes.
 */
import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/glossary/terms";
import type { Character } from "@/lib/characters/registry";

const ALWAYS: string[] = [
  "k-aesthetic",
  "styling-dna",
  "brand-kit",
  "category-exclusivity",
  "disclosure-metadata",
];

/**
 * Resolve the glossary entries shown on a character detail page.
 *
 * `glass-skin` is appended when the character's lighting recipe mentions
 * glass skin — Yuna gets it, Ren doesn't (his recipe is directional / noir-
 * leaning). Order matches the array passed in so the page renders
 * deterministically.
 */
export function glossaryForCharacter(character: Character): GlossaryTerm[] {
  const wanted = new Set<string>(ALWAYS);
  if (/glass[\s-]?skin/i.test(character.aesthetic.lighting)) {
    wanted.add("glass-skin");
  }
  // Preserve curated ordering: K-aesthetic, glass-skin (if applicable),
  // styling-dna, brand-kit, category-exclusivity, disclosure-metadata.
  const order = [
    "k-aesthetic",
    "glass-skin",
    "styling-dna",
    "brand-kit",
    "category-exclusivity",
    "disclosure-metadata",
  ];
  return order
    .filter((slug) => wanted.has(slug))
    .map((slug) => GLOSSARY_TERMS.find((t) => t.slug === slug))
    .filter((t): t is GlossaryTerm => Boolean(t));
}
