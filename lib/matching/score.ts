import type { GenreTag, IndustryTag, Model, MoodTag } from "@/types";
import { GENRE_OPTIONS, INDUSTRY_OPTIONS, MOOD_OPTIONS } from "@/lib/tags";

/**
 * Lightweight rules-based brief → model matching. No LLM call needed; runs
 * on the server in <10ms for a few hundred models. Returns 0–100 with a
 * `reasons` breakdown so the UI can explain *why* each model ranked where
 * it did — a key trust signal for the procurement-style users we're targeting.
 *
 * Heuristic:
 *   +35 per matched industry tag (capped at one match — primary fit)
 *   +25 per matched genre tag (capped at one)
 *   +20 per matched mood tag (capped at one)
 *   +10 if exclusive-available aligns with requested exclusivity
 *   + small budget proximity bonus (10..0 sliding)
 */

export interface MatchBrief {
  industries: IndustryTag[];
  genres: GenreTag[];
  moods: MoodTag[];
  budgetPerDay?: number | null;
  needsExclusive?: boolean;
  freeText?: string;
  /**
   * Optional "persona" weights — map of model_id → number of past inquiries
   * by the calling client. Each prior inquiry adds a small bonus (cap'd) so
   * a returning advertiser sees the people they've already worked with float
   * to the top *without* drowning out the rules-based fit. Empty by default.
   */
  personaInquiries?: Map<string, number>;
}

export interface MatchScore {
  model: Model;
  score: number;
  reasons: string[];
}

/** Cap on how much a returning client's history can move a single model. */
const PERSONA_MAX_BONUS = 12;
/** Points granted per past inquiry (saturates at PERSONA_MAX_BONUS). */
const PERSONA_PER_INQUIRY = 4;

const INDUSTRY_VALUES = new Set(INDUSTRY_OPTIONS.map((o) => o.value));
const GENRE_VALUES = new Set(GENRE_OPTIONS.map((o) => o.value));
const MOOD_VALUES = new Set(MOOD_OPTIONS.map((o) => o.value));

function firstOverlap<T extends string>(a: T[], b: T[] | null | undefined): T | null {
  if (!b) return null;
  for (const x of a) if (b.includes(x)) return x;
  return null;
}

/**
 * Word-boundary aware match. Avoids "tech" inside "biotech" (English) and
 * uses surrounding non-letter check for Korean since `\b` doesn't apply to CJK.
 */
function containsWord(haystack: string, needle: string): boolean {
  if (needle.length === 0) return false;
  // ASCII-only tokens — use proper word boundaries.
  if (/^[a-z0-9-]+$/i.test(needle)) {
    const re = new RegExp(`(?:^|[^a-z0-9-])${needle.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:$|[^a-z0-9-])`, "i");
    return re.test(haystack);
  }
  // CJK / mixed — fall back to substring (Korean labels don't need boundaries).
  return haystack.includes(needle);
}

export function extractTagsFromText(text: string): {
  industries: IndustryTag[];
  genres: GenreTag[];
  moods: MoodTag[];
} {
  // Cap text length so a 1MB blob can't blow up matching cost.
  const t = (text ?? "").slice(0, 2000).toLowerCase();
  const matchOpts = <T extends string>(opts: { value: T; label: string }[]): T[] => {
    const out: T[] = [];
    for (const o of opts) {
      if (
        containsWord(t, o.value.toLowerCase()) ||
        containsWord(t, o.label.toLowerCase())
      ) {
        out.push(o.value);
      }
    }
    return out;
  };
  return {
    industries: matchOpts(INDUSTRY_OPTIONS).filter((v) => INDUSTRY_VALUES.has(v)),
    genres: matchOpts(GENRE_OPTIONS).filter((v) => GENRE_VALUES.has(v)),
    moods: matchOpts(MOOD_OPTIONS).filter((v) => MOOD_VALUES.has(v)),
  };
}

export function scoreModel(model: Model, brief: MatchBrief): MatchScore {
  const reasons: string[] = [];
  let score = 0;

  const industryHit = firstOverlap(brief.industries, model.industry_tags);
  if (industryHit) {
    score += 35;
    reasons.push(`산업 매치: ${industryHit}`);
  }
  const genreHit = firstOverlap(brief.genres, model.genre_tags);
  if (genreHit) {
    score += 25;
    reasons.push(`장르 매치: ${genreHit}`);
  }
  const moodHit = firstOverlap(brief.moods, model.mood_tags);
  if (moodHit) {
    score += 20;
    reasons.push(`분위기 매치: ${moodHit}`);
  }
  if (brief.needsExclusive && model.is_exclusive_available) {
    score += 10;
    reasons.push("독점 가능");
  }
  if (
    brief.budgetPerDay &&
    model.base_price &&
    model.base_price <= brief.budgetPerDay
  ) {
    // Closer to budget = larger bonus, up to 10 pts when free, 0 at parity.
    // (1 - ratio) × 10, rounded; no longer drift +1 like the old version.
    const ratio = model.base_price / brief.budgetPerDay;
    const bonus = Math.round(Math.max(0, (1 - ratio) * 10));
    if (bonus > 0) {
      score += bonus;
      reasons.push(`예산 내 (${bonus}pt)`);
    } else {
      // Still acknowledge that the model fits the budget, just no bonus.
      score += 1;
      reasons.push("예산 한도 내");
    }
  }

  // Light popularity tiebreaker so big-name models float on ties.
  score += Math.min(5, Math.log10(1 + (model.follower_count ?? 0)));

  // Persona bonus — returning client previously inquired about this model.
  // Capped so a single repeat advertiser can't pin the same model at #1
  // forever; the rules-based fit still dominates the score.
  const past = brief.personaInquiries?.get(model.id) ?? 0;
  if (past > 0) {
    const bonus = Math.min(PERSONA_MAX_BONUS, past * PERSONA_PER_INQUIRY);
    score += bonus;
    reasons.push(`이전 협업 ${past}회 (+${bonus}pt)`);
  }

  return { model, score, reasons };
}

export function rankModels(models: Model[], brief: MatchBrief): MatchScore[] {
  return models
    .map((m) => scoreModel(m, brief))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
