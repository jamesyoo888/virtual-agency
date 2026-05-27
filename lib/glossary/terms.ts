/**
 * K-aesthetic / synthetic talent vocabulary — long-tail SEO acquisition.
 *
 * Buyers searching «what is K-aesthetic», «glass skin lighting», «AI synthetic
 * talent licensing» land on the glossary page. DefinedTerm JSON-LD makes each
 * entry rich-snippet eligible.
 *
 * KR + EN variants ship from this single registry; the page just toggles
 * field. We keep definitions tight (1-3 sentences) — long-form lives on
 * the blog.
 */

/**
 * Coarse buckets for navigation grouping on the glossary page.
 * - visual: things you see in the frame (K-aesthetic, glass-skin, styling-dna)
 * - commercial: license mechanics buyers negotiate (brand-kit, exclusivity)
 * - compliance: regulator-facing artifacts (disclosure metadata, AI disclosure)
 * - workflow: how the campaign moves through the pipeline (RFP, concept sheet)
 * - product: platform features (matching engine, Person JSON-LD)
 */
export type GlossaryCategory =
  | "visual"
  | "commercial"
  | "compliance"
  | "workflow"
  | "product";

export interface GlossaryTerm {
  /** URL slug — used by anchor links and JSON-LD identifier. */
  slug: string;
  /** Thematic bucket for nav grouping + page rendering. */
  category: GlossaryCategory;
  ko: { term: string; definition: string };
  en: { term: string; definition: string };
  /** Cross-link to a blog post that goes deep on the term. */
  relatedPostSlug?: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "k-aesthetic",
    category: "visual",
    ko: {
      term: "K-aesthetic",
      definition:
        "한국 시각 언어 — 소프트한 글래스 스킨 라이팅, 쿨 방향의 컬러 팔레트, 절제된 미니멀리즘, 제품을 주인공으로 두는 구성. K-pop·K-drama·K-beauty가 글로벌화하면서 광고 카테고리에서 인지 가능한 시각 코드로 자리 잡았습니다.",
    },
    en: {
      term: "K-aesthetic",
      definition:
        "A Korean visual language — soft glass-skin lighting, cool-leaning color palettes, controlled minimalism, and a product-as-protagonist composition register. K-pop, K-drama, and K-beauty made it a recognizable ad-category cue worldwide.",
    },
    relatedPostSlug: "what-is-k-aesthetic-brand-guide",
  },
  {
    slug: "glass-skin",
    category: "visual",
    ko: {
      term: "글래스 스킨 (Glass skin)",
      definition:
        "촘촘하고 듀이하게 빛나는 한국식 피부 표현. 부드러운 5500K 키 라이트 + 낮은 콘트라스트 필 + 따뜻한 림 라이트가 표준 레시피. K-뷰티 광고의 시그니처 룩.",
    },
    en: {
      term: "Glass skin",
      definition:
        "The dewy, fine-pored Korean skin finish. The standard recipe: soft 5500K key + low-contrast fill + warm rim. The signature look of K-beauty advertising.",
    },
    relatedPostSlug: "glass-skin-photography-lighting",
  },
  {
    slug: "synthetic-talent",
    category: "visual",
    ko: {
      term: "Synthetic talent (합성 모델)",
      definition:
        "AI 로 생성된 가상의 인물 모델. 실제 인물의 초상권을 사용하지 않고, 라이선스·시장·시즌을 가로질러 같은 얼굴을 유지할 수 있습니다. EU AI Act·FTC·ASA·방심위 모두 표기 의무 부과.",
    },
    en: {
      term: "Synthetic talent",
      definition:
        "An AI-generated virtual person used as a brand asset. No real-person likeness, the same face usable across markets, seasons, and contracts. Disclosure mandated by EU AI Act, US FTC, UK ASA, and Korea KCSC.",
    },
    relatedPostSlug: "synthetic-talent-vs-real-models-cost",
  },
  {
    slug: "brand-kit",
    category: "commercial",
    ko: {
      term: "브랜드 키트 (Brand kit)",
      definition:
        "한 시즌 또는 분기 단위로 캐스트·팔레트·라이팅·워드로브 DNA를 잠그는 라이선스 패키지. 페어 키트는 2개 캐릭터가 같은 스타일링 DNA로 한 시즌을 커버합니다.",
    },
    en: {
      term: "Brand kit",
      definition:
        "A quarter-long license bundle that locks cast, palette, lighting recipe, and wardrobe DNA. A paired kit uses two characters sharing the same styling DNA to cover a season.",
    },
  },
  {
    slug: "category-exclusivity",
    category: "commercial",
    ko: {
      term: "카테고리 독점 (Category exclusivity)",
      definition:
        "광고주의 산업 카테고리 내 경쟁사가 같은 캐릭터를 사용하지 못하도록 잠그는 라이선스 옵션. 분기 단위로 지정하며 «Season Anchor» 티어 이상에서 기본 포함됩니다.",
    },
    en: {
      term: "Category exclusivity",
      definition:
        "A license option that locks competitors in your category out of the same character for the contracted quarter. Included in Season Anchor tier, available as an add-on on Paired Editorial.",
    },
  },
  {
    slug: "disclosure-metadata",
    category: "compliance",
    ko: {
      term: "Disclosure 메타데이터",
      definition:
        "납품 파일의 XMP 블록에 동봉되는 AI 합성 표기 메타데이터 묶음. C2PA 출처 정보(EU) + schema.org Person.disambiguatingDescription(SEO) + 시장별 «AI Synthetic» 문자열 + 생성 해시 + 브랜드 서명.",
    },
    en: {
      term: "Disclosure metadata",
      definition:
        "The AI-synthetic disclosure bundle embedded in each delivery's XMP block: C2PA provenance (EU), schema.org Person.disambiguatingDescription (SEO), per-market AI-synthetic string, generator hash, and brand-side approval signature.",
    },
    relatedPostSlug: "ai-content-disclosure-metadata-4-markets",
  },
  {
    slug: "styling-dna",
    category: "visual",
    ko: {
      term: "Styling DNA",
      definition:
        "캐릭터별로 잠긴 시각 일관성 — 팔레트 앵커, 라이팅 레시피, 워드로브 레지스터. 같은 DNA로 설계된 캐릭터는 페어·시리즈로 캐스팅해도 캠페인이 한 톤으로 읽힙니다.",
    },
    en: {
      term: "Styling DNA",
      definition:
        "The per-character locked visual consistency — palette anchors, lighting recipe, wardrobe register. Two characters designed with shared DNA can be cast paired or in series and the campaign reads as one tone.",
    },
    relatedPostSlug: "paired-character-kits-vs-single-face-consistency",
  },
  {
    slug: "concept-sheet",
    category: "workflow",
    ko: {
      term: "컨셉 시트 (Concept sheet)",
      definition:
        "RFP 접수 24시간 안에 발송되는 1차 검증용 산출물. 무드보드 + 1-2 샘플 컷 + 캐릭터 핏 검토. 풀 셋 계약 전 톤을 확인할 수 있는 게이트입니다.",
    },
    en: {
      term: "Concept sheet",
      definition:
        "The 24-hour first-pass deliverable: moodboard + 1-2 sample shots + character-fit review. The gate that lets buyers confirm campaign tone before the full-set contract.",
    },
  },
  {
    slug: "lookbook",
    category: "workflow",
    ko: {
      term: "Lookbook",
      definition:
        "한 시즌·한 컨셉의 시각 자산 묶음. 보통 5-15컷 + 영상 1-2편 + 메타데이터 + 시장별 disclosure 라벨. A4 인쇄용 PDF 추출 가능 (`/models/[id]/lookbook`).",
    },
    en: {
      term: "Lookbook",
      definition:
        "A single-season, single-concept visual asset bundle — typically 5-15 stills + 1-2 videos + metadata + per-market disclosure labels. Print-ready PDF export available at /models/[id]/lookbook.",
    },
  },
  {
    slug: "rfp",
    category: "workflow",
    ko: {
      term: "RFP (Request for Proposal)",
      definition:
        "캠페인 명 · 런칭일 · 매체 · 헤로 카피 · 업종 · 예산을 구조화해 입력하는 견적 요청. `/rfp` 페이지에서 작성하면 매칭 모델 top 5 + 캐릭터 추천 + A4 인쇄 가능한 1-page PDF 동시 출력.",
    },
    en: {
      term: "RFP (Request for Proposal)",
      definition:
        "The structured brief input: campaign name, launch date, channels, hero copy, industry, budget. Submitting at /rfp returns matched models, character recommendations, and a print-ready one-page PDF in the same flow.",
    },
    relatedPostSlug: "rfp-brief-checklist-k-aesthetic-campaign",
  },
  {
    slug: "ai-disclosure",
    category: "compliance",
    ko: {
      term: "AI 표기 (AI disclosure)",
      definition:
        "AI 생성 콘텐츠를 소비자가 인지할 수 있도록 표기하는 의무. EU AI Act Article 50 (출처 메타데이터 + 라벨), US FTC, UK ASA, 한국 방심위·공정위 모두 시장별 요구사항이 다릅니다. `/legal/ai-disclosure` 참고.",
    },
    en: {
      term: "AI disclosure",
      definition:
        "The labeling obligation that AI-generated content be recognizable to consumers. EU AI Act Article 50 (provenance metadata + label), US FTC, UK ASA, and Korea KCSC each prescribe different forms. See /en/legal/ai-disclosure.",
    },
  },
  {
    slug: "exclusive-campaign",
    category: "commercial",
    ko: {
      term: "독점 캠페인 (Exclusive campaign)",
      definition:
        "기본 라이선스보다 강한 형태로, 해당 캐릭터를 산업 전체 또는 모든 시장에서 잠그는 라이선스. 가격은 비독점 대비 1.8~2.5배. 브랜드 정의 캠페인 또는 멀티 시즌 앵커링용.",
    },
    en: {
      term: "Exclusive campaign",
      definition:
        "A stronger license form that locks the character across an entire industry or every market. Priced at 1.8-2.5× non-exclusive. For brand-defining campaigns or multi-season anchoring.",
    },
  },
  {
    slug: "person-jsonld",
    category: "product",
    ko: {
      term: "Person JSON-LD",
      definition:
        "schema.org Person 그래프로 캐릭터 페이지 SEO를 보강하는 메타데이터. disambiguatingDescription 으로 합성임을 명시, additionalType=Service, knowsAbout 으로 verticals/moods/K-aesthetic 키워드를 노출.",
    },
    en: {
      term: "Person JSON-LD",
      definition:
        "schema.org Person graph that boosts character-page SEO. disambiguatingDescription marks the synthetic nature, additionalType=Service signals the licensing context, and knowsAbout surfaces verticals/moods/K-aesthetic keywords.",
    },
  },
  {
    slug: "matching-engine",
    category: "product",
    ko: {
      term: "AI 매칭 엔진",
      definition:
        "자유 텍스트 광고 컨셉 + 산업/장르/무드 + 예산을 입력받아 카탈로그 모델을 태그 점수로 랭킹하는 엔진. 35/25/20 가중치 + 예산 보너스 + 페르소나 부스트 (광고주 인콰이어 + RFP 이력 기반). `/match` 에서 호출.",
    },
    en: {
      term: "AI matching engine",
      definition:
        "Takes free-text campaign concept + industry/mood/genre + budget and ranks catalog models by weighted tag overlap (35/25/20) plus budget bonus and persona boost from past inquiries and RFPs. Available at /en/match.",
    },
  },
  {
    slug: "ambassador-licensing",
    category: "commercial",
    ko: {
      term: "앰배서더 라이선스",
      definition:
        "한 캐릭터가 한 브랜드의 «얼굴» 로 다년 또는 분기 단위로 묶이는 계약. 카테고리 독점이 포함되며, 한 시즌의 여러 SKU·캠페인에 동일 얼굴이 사용됩니다. 일별 라이선스의 5-10배 가격이지만 브랜드 정체성과 시각 일관성 가치가 큰 브랜드에 합당.",
    },
    en: {
      term: "Ambassador licensing",
      definition:
        "A multi-year or quarterly license that binds a character as a brand's «face» across all in-category creative. Carries category exclusivity. Priced 5-10× a per-day license, but worth it when brand identity and visual consistency carry strategic weight.",
    },
    relatedPostSlug: "ai-model-exclusivity-when-to-pay-for-it",
  },
  {
    slug: "run-rate",
    category: "commercial",
    ko: {
      term: "런-레이트 (Run rate)",
      definition:
        "현재의 매출 흐름이 같은 페이스로 유지된다고 가정했을 때의 forward 예상치. /admin/forecast 의 «next-90d projection» 은 현재 90일 run-rate 를 그대로 forward 한 값. 시즌·캠페인 영향이 있는 경우 보정 필요.",
    },
    en: {
      term: "Run rate",
      definition:
        "A forward projection assuming current revenue pace continues unchanged. The /admin/forecast «next-90d» figures roll forward the trailing 90-day run-rate; seasonal or campaign effects need manual adjustment.",
    },
  },
  {
    slug: "paired-campaign",
    category: "visual",
    ko: {
      term: "페어 캠페인 (Paired campaign)",
      definition:
        "두 캐릭터 (e.g. Yuna + Ren) 가 공유된 스타일링 DNA 로 같이 등장하는 캠페인. 커플 내러티브·크로스젠더 캐스팅·시즌 앵커 등에서 «한 톤, 두 얼굴» 로 읽힙니다. brand-kit 의 paired-editorial / season-anchor 티어에 포함.",
    },
    en: {
      term: "Paired campaign",
      definition:
        "A campaign featuring two characters (e.g. Yuna + Ren) under a shared styling DNA. Reads as «one tone, two faces» — used for couple narratives, cross-gender casting, and season anchors. Covered by the paired-editorial and season-anchor brand-kit tiers.",
    },
    relatedPostSlug: "paired-character-kits-vs-single-face-consistency",
  },
  {
    slug: "localization-layer",
    category: "workflow",
    ko: {
      term: "로컬라이제이션 레이어",
      definition:
        "한 캠페인을 4개 시장 (KR/US/EU/SG) 으로 전개할 때, 동일한 크리에이티브 어셋 위에 시장별 카피·통화·디스클로저 레이블·플랫폼 어셋만 다르게 입히는 워크플로. 4 캠페인이 아닌 «1 캠페인 + 4 레이어» 로 운영해야 비용·일관성이 모두 가능.",
    },
    en: {
      term: "Localization layer",
      definition:
        "When the same campaign runs across KR/US/EU/SG, deliver one creative asset and layer market-specific copy, currency, disclosure label, and platform format on top. Treats it as «one campaign + four layers» instead of four campaigns — the only way to keep cost and consistency together.",
    },
    relatedPostSlug: "cross-market-launch-kr-us-eu-sg",
  },
  {
    slug: "disclosure-provenance",
    category: "compliance",
    ko: {
      term: "디스클로저 프로비넌스 (C2PA)",
      definition:
        "어셋의 출처·합성 여부·생성기·서명을 체인 형태로 기록하는 표준. C2PA-aligned manifest 가 어셋 파일과 같이 이동하며, 플랫폼 측 AI 감지층과 규제 inquiry 시 chain-of-custody 증명에 사용. Virtual Agency 의 모든 캐릭터 출하물에 포함.",
    },
    en: {
      term: "Disclosure provenance (C2PA)",
      definition:
        "A chained record of an asset's origin, synthetic status, generator, and signature. The C2PA-aligned manifest travels with the file and is used by platform AI-detection layers and regulator inquiries as chain-of-custody. Shipped with every Virtual Agency character delivery.",
    },
    relatedPostSlug: "ai-content-disclosure-metadata-4-markets",
  },
  {
    slug: "buyer-funnel",
    category: "product",
    ko: {
      term: "Buyer funnel",
      definition:
        "광고주의 의사결정 단계 (인지·탐색·검토·견적·계약) 를 따라 검색 의도가 진화하는 흐름. Virtual Agency 의 블로그·캐릭터 페이지·시리즈는 단계별 검색 키워드에 응대하도록 설계 — 인지 단계는 «K-aesthetic 이란», 견적 단계는 «K-aesthetic AI 예산 밴드» 식.",
    },
    en: {
      term: "Buyer funnel",
      definition:
        "The flow of search intent as a brand buyer progresses through awareness → exploration → review → quote → contract. Virtual Agency's blog, character pages, and series are built to answer the dominant keyword at each step — e.g. «what is K-aesthetic» at awareness, «K-aesthetic AI budget bands» at quote.",
    },
  },
];

export function getTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export const GLOSSARY_CATEGORY_ORDER: GlossaryCategory[] = [
  "visual",
  "commercial",
  "compliance",
  "workflow",
  "product",
];

export const GLOSSARY_CATEGORY_LABELS: Record<
  GlossaryCategory,
  { ko: string; en: string }
> = {
  visual: { ko: "비주얼", en: "Visual" },
  commercial: { ko: "라이선스", en: "Commercial" },
  compliance: { ko: "컴플라이언스", en: "Compliance" },
  workflow: { ko: "워크플로", en: "Workflow" },
  product: { ko: "플랫폼", en: "Product" },
};

export function groupByCategory(
  terms: GlossaryTerm[] = GLOSSARY_TERMS
): Array<{ category: GlossaryCategory; entries: GlossaryTerm[] }> {
  return GLOSSARY_CATEGORY_ORDER.map((category) => ({
    category,
    entries: terms.filter((t) => t.category === category),
  })).filter((g) => g.entries.length > 0);
}
