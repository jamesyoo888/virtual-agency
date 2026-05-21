import { listPosts, type BlogPost } from "@/lib/blog/posts";

/**
 * Map an industry tag to a curated set of related blog tags. We don't keyword-
 * search post titles — too brittle — instead each industry declares which
 * authored tags it wants to surface, and posts matching ANY of those tags are
 * shown (recency tie-break).
 *
 * Empty list returns the most recent posts so the section always has content.
 */
const INDUSTRY_TAGS: Record<string, string[]> = {
  beauty: ["산업", "플레이북", "사례", "전략", "측정"],
  tech: ["전략", "측정", "데이터", "캠페인"],
  food: ["산업", "플레이북", "측정"],
  luxury: ["독점", "라이선스", "전략", "브랜드 안전성"],
  sports: ["전략", "캠페인", "측정"],
  lifestyle: ["가이드", "브리프", "매칭", "캠페인"],
};

export function relatedPostsForIndustry(industry: string, limit = 3): BlogPost[] {
  const tags = INDUSTRY_TAGS[industry] ?? [];
  if (tags.length === 0) return listPosts().slice(0, limit);
  const tagSet = new Set(tags);
  const scored = listPosts().map((p) => {
    const overlap = p.tags.filter((t) => tagSet.has(t)).length;
    return { post: p, overlap };
  });
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.post.publishedAt.localeCompare(a.post.publishedAt);
  });
  return scored.slice(0, limit).map((s) => s.post);
}
