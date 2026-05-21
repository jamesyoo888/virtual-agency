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
  updatedAt?: string;
  tags?: string[];
  /** Optional reading-time signal exposed to crawlers + assistants. */
  readingMinutes?: number;
}

export function blogPostingLd(input: ArticleLdInput) {
  const url = `${SITE_URL}/blog/${input.slug}`;
  const ogImage = `${SITE_URL}/api/og?blog=${encodeURIComponent(input.slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    headline: input.title,
    description: input.description,
    url,
    image: [ogImage],
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    inLanguage: "ko-KR",
    keywords: input.tags?.join(", "),
    articleSection: input.tags?.[0],
    wordCount: input.readingMinutes ? input.readingMinutes * 250 : undefined,
    timeRequired: input.readingMinutes ? `PT${input.readingMinutes}M` : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Organization",
      name: `${ORG_NAME} Editorial`,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/press/logo-mark.svg`,
      },
    },
  };
}

export interface ServiceLdInput {
  name: string;
  description: string;
  url: string;
  /** Optional price range as a free-form string ("₩200만~₩800만"). */
  priceRange?: string;
  /** Estimated delivery window as schema-friendly duration text. */
  deliveryTime?: string;
}

export function serviceLd(input: ServiceLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": input.url,
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.name,
    provider: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_URL,
    },
    areaServed: { "@type": "Country", name: "Republic of Korea" },
    ...(input.priceRange
      ? { offers: { "@type": "Offer", priceCurrency: "KRW", priceSpecification: { "@type": "PriceSpecification", priceCurrency: "KRW", description: input.priceRange } } }
      : {}),
    ...(input.deliveryTime ? { hoursAvailable: input.deliveryTime } : {}),
  };
}

export interface ItemListEntry {
  name: string;
  url: string;
  /** Optional thumbnail; falls through to the page's OG image if omitted. */
  image?: string;
}

export function itemListLd(name: string, entries: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: e.url,
      name: e.name,
      ...(e.image ? { image: e.image } : {}),
    })),
  };
}

export interface SiteNavEntry {
  name: string;
  url: string;
}

/**
 * SiteNavigationElement is Google's recommended hint for sitelink eligibility
 * — emit it on the root layout so the public nav is discoverable in one shot.
 * Per schema.org we wrap the elements in an ItemList for consumer clarity.
 */
export function siteNavigationLd(entries: SiteNavEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${ORG_NAME} site navigation`,
    itemListElement: entries.map((e, i) => ({
      "@type": "SiteNavigationElement",
      position: i + 1,
      name: e.name,
      url: e.url,
    })),
  };
}

export interface HowToStepInput {
  name: string;
  text: string;
}

export interface HowToLdInput {
  name: string;
  description: string;
  url: string;
  /** Optional total time, e.g. "PT15M". */
  totalTime?: string;
  steps: HowToStepInput[];
}

export function howToLd(input: HowToLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    inLanguage: "ko-KR",
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${input.url}#step-${i + 1}`,
    })),
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
