import type { Model } from "@/types";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";
const ORG_NAME = "Virtual Agency";

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: SITE_URL,
    description: "AI 기반 버추얼 모델 에이전시 — 광고, SNS, 영상 콘텐츠를 위한 가상 모델 라이선싱",
    sameAs: [],
  };
}

export interface AggregateRatingInput {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export function modelPersonLd(model: Model, rating?: AggregateRatingInput) {
  const url = `${SITE_URL}/models/${model.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    name: model.name,
    description: model.bio ?? `Virtual Agency 의 AI 버추얼 모델 ${model.name}`,
    url,
    image: model.concept_image ?? undefined,
    sameAs: model.instagram_handle
      ? [`https://www.instagram.com/${model.instagram_handle.replace(/^@/, "")}`]
      : undefined,
    knowsAbout: [
      ...(model.industry_tags ?? []),
      ...(model.genre_tags ?? []),
    ],
    additionalType: "https://schema.org/Service",
    // Only emitted when a real review pipeline ships — keeps Google from
    // flagging empty/fabricated rating data while leaving the wiring in place.
    aggregateRating: rating
      ? {
          "@type": "AggregateRating",
          ratingValue: rating.ratingValue,
          reviewCount: rating.reviewCount,
          bestRating: rating.bestRating ?? 5,
          worstRating: rating.worstRating ?? 1,
        }
      : undefined,
  };
}

export function modelOfferLd(model: Model) {
  if (!model.base_price) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: `${model.name} 모델 라이선스`,
    price: model.base_price,
    priceCurrency: "KRW",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: model.base_price,
      priceCurrency: "KRW",
      unitText: "DAY",
      referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
    },
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: ORG_NAME },
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ArticleLdInput {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  tags?: string[];
}

export function blogPostingLd(input: ArticleLdInput) {
  const url = `${SITE_URL}/blog/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    headline: input.title,
    description: input.description,
    url,
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    inLanguage: "ko-KR",
    keywords: input.tags?.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: ORG_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_URL,
    },
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function faqPageLd(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };
}

/** Serialize a JSON-LD object for embedding in a <script type="application/ld+json"> tag. */
export function ldScript(obj: unknown): string {
  // Prevent </script> injection in case any string contains it.
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
