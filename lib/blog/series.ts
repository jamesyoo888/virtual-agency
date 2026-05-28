/**
 * Curated blog series. We surface "Part N of M" navigation on /blog/[slug]
 * (KR + EN) so a reader who lands on one post can step through the
 * adjacent ones intentionally rather than relying on the "related posts"
 * tag-overlap heuristic.
 *
 * Series are an editorial decision, not derived from tags. Keep the order
 * meaningful (intro → deep → operational) so the "next" link always lands
 * the reader on something marginally more advanced than where they were.
 *
 * Adding a new series: append below. A slug can appear in multiple series
 * — `getSeriesForPost` returns the first match, which is fine because we
 * cross-link series from the post body when there's overlap.
 */

import type { BlogLocale } from "./posts";

export type BlogSeriesId =
  | "rfp-funnel"
  | "character-ip"
  | "compliance"
  | "pricing-and-cost"
  | "operator-honesty";

export interface BlogSeries {
  id: BlogSeriesId;
  /** Locale this series belongs to — keeps EN and KR series independent. */
  locale: BlogLocale;
  /** Human-readable title shown above the part-navigator. */
  title: string;
  /** One-line description for the series landing card. */
  description: string;
  /** Ordered list of post slugs, intro → advanced. */
  slugs: string[];
  /**
   * Character slug this series leans on most heavily — series detail page
   * surfaces a deep-link card so a reader who's invested in the topic can
   * also browse the related character profile / brand-kit options.
   */
  relatedCharacterSlug?: string;
  /**
   * Service detail anchor (e.g. "brand-kit", "lookbook", "matching") used to
   * deep-link a CTA on the series landing. Optional — many series have no
   * single matching service.
   */
  relatedService?:
    | "brand-kit"
    | "lookbook"
    | "matching"
    | "rfp"
    | "compliance-audit";
}

export const BLOG_SERIES: BlogSeries[] = [
  {
    id: "rfp-funnel",
    locale: "en",
    title: "Brief & RFP series",
    description:
      "From the first brief to a signed RFP — the buyer-funnel walkthrough for K-aesthetic AI campaigns.",
    slugs: [
      "how-to-brief-an-ai-model-k-aesthetic",
      "rfp-brief-checklist-k-aesthetic-campaign",
      "k-aesthetic-rfp-budget-bands-usd",
      "ai-campaign-feedback-loop-best-practices",
    ],
    relatedService: "rfp",
  },
  {
    id: "character-ip",
    locale: "en",
    title: "Character IP series",
    description:
      "Why we built Yuna and Ren as owned characters, and how to use them across markets.",
    slugs: [
      "paired-character-kits-vs-single-face-consistency",
      "yuna-vs-ren-brand-kit-pairing-strategy",
      "ai-model-exclusivity-when-to-pay-for-it",
      "cross-market-launch-kr-us-eu-sg",
    ],
    relatedCharacterSlug: "yuna",
    relatedService: "brand-kit",
  },
  {
    id: "compliance",
    locale: "en",
    title: "Compliance series",
    description:
      "Disclosure metadata, regulator requirements, and pre-launch sign-off for synthetic-talent campaigns.",
    slugs: [
      "ai-content-disclosure-metadata-4-markets",
      "eu-ai-act-article-50-for-brand-marketers",
      "synthetic-campaign-pre-launch-compliance-checklist",
    ],
    relatedService: "compliance-audit",
  },
  {
    id: "rfp-funnel",
    locale: "ko",
    title: "브리프·RFP 시리즈",
    description:
      "첫 브리프부터 RFP 사인까지 — K-aesthetic AI 캠페인 buyer 가이드 순차 학습.",
    slugs: [
      "how-to-write-a-brief-for-virtual-models",
      "b2b-buying-checklist-virtual-models",
      "k-aesthetic-rfp-budget-bands-krw-ko",
      "ai-virtual-model-contract-checklist-korea",
    ],
    relatedService: "rfp",
  },
  {
    id: "character-ip",
    locale: "ko",
    title: "캐릭터 IP 시리즈",
    description:
      "Yuna 와 Ren 을 자체 캐릭터로 만든 이유 — 결정·브리프·캐스팅·운영 가이드.",
    slugs: [
      "yuna-vs-ren-character-casting-guide-ko",
      "paired-character-kits-vs-single-face-ko",
      "owned-character-as-brand-moat-ko",
    ],
    relatedCharacterSlug: "yuna",
    relatedService: "brand-kit",
  },
  {
    id: "compliance",
    locale: "ko",
    title: "컴플라이언스 시리즈",
    description:
      "방심위·EU AI Act 등 4 시장 디스클로저 의무와 캠페인 사전 체크리스트.",
    slugs: [
      "ai-content-disclosure-korea-kcc-kftc",
      "ai-content-disclosure-compliance-2026",
      "synthetic-campaign-pre-launch-compliance-checklist-ko",
    ],
    relatedService: "compliance-audit",
  },
  {
    id: "pricing-and-cost",
    locale: "en",
    title: "Pricing & cost series",
    description:
      "How the cost estimator works, what total campaign cost actually decomposes into, when to upgrade your brand-kit tier, and the QA checks that justify what you paid.",
    slugs: [
      "inside-the-pricing-calculator-4-inputs",
      "total-campaign-cost-decomposition",
      "brand-kit-upgrade-path-when-to-move-tiers",
      "synthetic-talent-qa-checklist-before-paying",
    ],
    relatedService: "brand-kit",
  },
  {
    id: "pricing-and-cost",
    locale: "ko",
    title: "가격과 비용 시리즈",
    description:
      "견적 계산기 4 입력의 의미, 캠페인 총 비용 분해, 브랜드 키트 티어 업그레이드 결정, 그리고 ROI 계산기 프레임워크 — 광고주의 buyer-funnel 깊이 읽기.",
    slugs: [
      "inside-the-pricing-calculator-4-inputs-ko",
      "total-campaign-cost-decomposition-ko",
      "brand-kit-upgrade-path-ko",
      "k-aesthetic-campaign-roi-calculator-ko",
    ],
    relatedService: "brand-kit",
  },
  {
    id: "operator-honesty",
    locale: "en",
    title: "Operator honesty series",
    description:
      "Posts we publish even when they cost us inquiries — when not to use synthetic talent, RFPs we turn down, metrics that actually matter, and what we measure in the first 30 days.",
    slugs: [
      "when-not-to-use-synthetic-talent",
      "why-we-reject-rfps-common-patterns",
      "post-launch-metrics-which-numbers-actually-matter",
      "first-30-days-campaign-measurement",
    ],
    relatedService: "rfp",
  },
];

export interface SeriesPosition {
  series: BlogSeries;
  /** 1-based index of this post in the series. */
  part: number;
  /** Total number of posts in the series. */
  total: number;
  /** Slug of the prior post in the series, null if first. */
  prevSlug: string | null;
  /** Slug of the next post in the series, null if last. */
  nextSlug: string | null;
}

/**
 * Find the (first) series this post belongs to in the given locale. A post
 * can legitimately belong to multiple series — we return the first match so
 * the page renders deterministically. Cross-link manually when needed.
 */
export function getSeriesForPost(
  slug: string,
  locale: BlogLocale
): SeriesPosition | null {
  for (const series of BLOG_SERIES) {
    if (series.locale !== locale) continue;
    const idx = series.slugs.indexOf(slug);
    if (idx === -1) continue;
    return {
      series,
      part: idx + 1,
      total: series.slugs.length,
      prevSlug: idx > 0 ? series.slugs[idx - 1] : null,
      nextSlug:
        idx < series.slugs.length - 1 ? series.slugs[idx + 1] : null,
    };
  }
  return null;
}

export function listSeries(locale: BlogLocale): BlogSeries[] {
  return BLOG_SERIES.filter((s) => s.locale === locale);
}
