/**
 * Glossary slugs that read more concretely when paired with a link to the
 * character roster — because the terms only really exist as commercial
 * mechanics for our owned IP.
 *
 * brand-kit / category-exclusivity / styling-dna are abstract definitions
 * unless the reader can see who they apply to. The glossary page renders a
 * one-line «See in practice: Yuna · Ren» card under each of these terms.
 */
export const CHARACTER_CONTEXT_SLUGS = new Set<string>([
  "brand-kit",
  "category-exclusivity",
  "styling-dna",
]);

export function hasCharacterContext(slug: string): boolean {
  return CHARACTER_CONTEXT_SLUGS.has(slug);
}
