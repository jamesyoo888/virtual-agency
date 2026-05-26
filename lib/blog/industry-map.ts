import { listPosts, type BlogPost, type BlogLocale } from "@/lib/blog/posts";

/**
 * Map an industry tag to a curated set of related blog tags. We don't keyword-
 * search post titles — too brittle — instead each industry declares which
 * authored tags it wants to surface, and posts matching ANY of those tags are
 * shown (recency tie-break).
 *
 * Empty list returns the most recent posts so the section always has content.
 *
 * Korean (ko) and English (en) posts use different tag vocabularies, so each
 * locale gets its own mapping. The locale-aware helpers below pick the right
 * map and filter posts to the matching locale.
 */
const INDUSTRY_TAGS: Record<string, string[]> = {
  beauty: ["산업", "플레이북", "사례", "전략", "측정"],
  tech: ["전략", "측정", "데이터", "캠페인"],
  food: ["산업", "플레이북", "측정"],
  luxury: ["독점", "라이선스", "전략", "브랜드 안전성"],
  sports: ["전략", "캠페인", "측정"],
  lifestyle: ["가이드", "브리프", "매칭", "캠페인"],
};

const MOOD_TAGS: Record<string, string[]> = {
  cold: ["전략", "독점", "라이선스"],
  warm: ["가이드", "브리프", "캠페인"],
  neutral: ["가이드", "산업", "측정"],
  edgy: ["전략", "독점", "브랜드 안전성"],
};

const GENRE_TAGS: Record<string, string[]> = {
  ad: ["전략", "캠페인", "측정"],
  film: ["전략", "캠페인", "측정"],
  drama: ["산업", "플레이북", "캠페인"],
  noir: ["독점", "라이선스", "전략"],
  romance: ["가이드", "산업", "브리프"],
  "sci-fi": ["측정", "데이터", "캠페인"],
  historical: ["독점", "라이선스"],
  indie: ["가이드", "브리프"],
  horror: ["브랜드 안전성", "전략"],
};

// English-locale mappings — tags come from the en blog posts in lib/blog/posts.ts
// (locale: "en"). Adjust here when adding new EN posts with new tags.
const INDUSTRY_TAGS_EN: Record<string, string[]> = {
  beauty: ["K-beauty", "K-aesthetic", "creative direction", "case", "lighting"],
  tech: ["brand strategy", "performance", "ROI", "strategy"],
  food: ["K-aesthetic", "brand strategy", "creative direction"],
  luxury: ["K-aesthetic", "brand strategy", "creative direction", "casting"],
  sports: ["brand strategy", "performance", "casting"],
  lifestyle: [
    "K-aesthetic",
    "K-fashion",
    "brand strategy",
    "social media",
  ],
};

const MOOD_TAGS_EN: Record<string, string[]> = {
  cold: ["creative direction", "K-aesthetic", "lighting"],
  warm: ["K-beauty", "creative direction", "brand strategy"],
  neutral: ["brand strategy", "K-aesthetic", "casting"],
  edgy: ["K-fashion", "brand strategy", "casting"],
};

const GENRE_TAGS_EN: Record<string, string[]> = {
  ad: ["brand strategy", "ROI", "performance"],
  film: ["creative direction", "lighting"],
  drama: ["K-aesthetic", "creative direction"],
  noir: ["creative direction", "lighting"],
  romance: ["K-aesthetic", "brand strategy"],
  "sci-fi": ["performance", "brand strategy"],
  historical: ["creative direction", "K-aesthetic"],
  indie: ["creative direction", "brand strategy"],
  horror: ["compliance", "brand strategy"],
};

function pickMap(
  type: "industry" | "mood" | "genre",
  locale: BlogLocale
): Record<string, string[]> {
  if (locale === "en") {
    if (type === "industry") return INDUSTRY_TAGS_EN;
    if (type === "mood") return MOOD_TAGS_EN;
    return GENRE_TAGS_EN;
  }
  if (type === "industry") return INDUSTRY_TAGS;
  if (type === "mood") return MOOD_TAGS;
  return GENRE_TAGS;
}

function rankByTags(
  targetTags: string[],
  limit: number,
  locale: BlogLocale
): BlogPost[] {
  const pool = listPosts(locale);
  if (targetTags.length === 0) return pool.slice(0, limit);
  const tagSet = new Set(targetTags);
  const scored = pool.map((p) => {
    const overlap = p.tags.filter((t) => tagSet.has(t)).length;
    return { post: p, overlap };
  });
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.post.publishedAt.localeCompare(a.post.publishedAt);
  });
  return scored.slice(0, limit).map((s) => s.post);
}

export function relatedPostsForIndustry(
  industry: string,
  limit = 3,
  locale: BlogLocale = "ko"
): BlogPost[] {
  return rankByTags(pickMap("industry", locale)[industry] ?? [], limit, locale);
}

export function relatedPostsForMood(
  mood: string,
  limit = 3,
  locale: BlogLocale = "ko"
): BlogPost[] {
  return rankByTags(pickMap("mood", locale)[mood] ?? [], limit, locale);
}

export function relatedPostsForGenre(
  genre: string,
  limit = 3,
  locale: BlogLocale = "ko"
): BlogPost[] {
  return rankByTags(pickMap("genre", locale)[genre] ?? [], limit, locale);
}
