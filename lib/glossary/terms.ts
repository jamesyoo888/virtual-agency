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

export interface GlossaryTerm {
  /** URL slug — used by anchor links and JSON-LD identifier. */
  slug: string;
  ko: { term: string; definition: string };
  en: { term: string; definition: string };
  /** Cross-link to a blog post that goes deep on the term. */
  relatedPostSlug?: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: "k-aesthetic",
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
];

export function getTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}
