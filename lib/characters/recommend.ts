import { listCharacters, type Character } from "./registry";

export interface CharacterMatchInput {
  /** Industry tags from the match brief. Strings are tolerated so the
   * helper can be called with `IndustryTag[]` from the EN/KR match pages
   * without a redundant cast. */
  industries: readonly string[];
  moods: readonly string[];
}

export interface CharacterMatch {
  character: Character;
  /** Weighted score: targetVertical hits ×2, defaultMood hits ×1. */
  score: number;
}

/**
 * Recommend owned characters whose targetVerticals or defaultMoods
 * intersect with the visitor's match brief. Higher score = stronger fit.
 *
 * Why this exists as a helper: we surface characters above the catalog on
 * /match (EN + KR) when there's signal that the brief leans toward the
 * owned IP. Keeping the scorer in one place means EN and KR pages stay in
 * sync and tests can guard against drift.
 *
 * Score weighting: verticals (e.g. «beauty», «luxury») are the strongest
 * signal because brands buy characters by industry fit first. Moods are a
 * weaker secondary signal — they tend to overlap across characters.
 *
 * @returns array sorted by descending score, excluding zero-score matches.
 */
export function recommendCharacters(
  brief: CharacterMatchInput
): CharacterMatch[] {
  return listCharacters()
    .map((c) => {
      const verticalHits = c.targetVerticals.filter((v) =>
        brief.industries.includes(v)
      ).length;
      const moodHits = c.defaultMoods.filter((m) =>
        brief.moods.includes(m)
      ).length;
      return { character: c, score: verticalHits * 2 + moodHits };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
