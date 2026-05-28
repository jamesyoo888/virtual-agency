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
  /** Optional KR-locale post slug. Falls back to relatedPostSlug. */
  relatedPostSlugKo?: string;
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
  {
    slug: "brief-template",
    category: "workflow",
    ko: {
      term: "브리프 템플릿 (Brief template)",
      definition:
        "RFP 직전 단계에 광고주가 내부 정렬을 위해 채우는 1-page 구조 문서. 캠페인 목표·헤로 카피·헤로 컷 컨셉·시즌·금지선·심사 시점·예산 밴드 항목이 표준. /brief-template 에서 한 영 양식 다운로드 가능 — 좋은 브리프가 좋은 매칭의 70%.",
    },
    en: {
      term: "Brief template",
      definition:
        "The one-page document brand teams fill out before RFP to align internally — campaign goal, hero copy, hero-shot concept, season, no-go zones, approval gate, budget band. Download the KR/EN template at /en/brief-template. A good brief carries 70% of the match quality.",
    },
    relatedPostSlug: "rfp-brief-checklist-k-aesthetic-campaign",
  },
  {
    slug: "moodboard",
    category: "workflow",
    ko: {
      term: "무드보드 (Moodboard)",
      definition:
        "캐스트·라이팅·팔레트·텍스처 톤의 시각 레퍼런스를 6-12 이미지로 묶은 인테이크 산출물. 컨셉 시트 발송 24h 전에 광고주와 합의되어 «어떤 톤으로 갈지» 를 픽셀 전 단계에서 잠그는 게이트. 사후 «톤이 다르다» 분쟁의 90% 가 이 단계에서 예방됩니다.",
    },
    en: {
      term: "Moodboard",
      definition:
        "A 6-12 image visual reference bundle covering cast, lighting, palette, and texture tone. Signed off with the buyer 24h before the concept sheet ships — the pre-pixel gate that locks tone direction. About 90% of «that's the wrong tone» disputes are prevented here.",
    },
  },
  {
    slug: "likeness-rights",
    category: "commercial",
    ko: {
      term: "초상권 (Likeness rights)",
      definition:
        "실제 인물의 얼굴·신체 특징을 광고에 사용할 권리. 합성 캐릭터는 실제 인물 초상권을 보유하지 않으므로 이 협상이 필요 없으며, 모델 사망·은퇴·계약 종료로 인한 캠페인 단절 리스크도 제거. 단, 우연한 유사성을 회피하는 face-similarity 검수가 별도로 필요합니다.",
    },
    en: {
      term: "Likeness rights",
      definition:
        "The right to use a real person's face / body in advertising. Synthetic characters carry no real-person likeness, so this negotiation disappears — and so does campaign continuity risk from death, retirement, or contract end. A face-similarity check still runs at delivery to rule out accidental real-person resemblance.",
    },
    relatedPostSlug: "synthetic-talent-vs-real-models-cost",
  },
  {
    slug: "content-velocity",
    category: "product",
    ko: {
      term: "콘텐츠 속도 (Content velocity)",
      definition:
        "한 캠페인 내에서 새 컷을 추가로 출하하는 데 필요한 시간. 실제 모델 + 스튜디오 + 헤어 메이크업 + 어시스턴트의 합산 lead-time 이 5-15일이라면, 합성 캐릭터는 동일 라이팅 레시피·워드로브·캐스트가 이미 잠겨 있어 4-48h. SNS 페이스를 매주 갱신해야 하는 광고주가 가장 가치 있게 평가하는 차이.",
    },
    en: {
      term: "Content velocity",
      definition:
        "How quickly additional shots ship within a single campaign. A real-model + studio + HMUA + assistant chain runs 5-15 days per refresh; a synthetic character with locked recipe/wardrobe/cast turns shots in 4-48h. The single dimension SNS-paced advertisers value most.",
    },
  },
  {
    slug: "recommended-path",
    category: "commercial",
    ko: {
      term: "권장 path (Recommended path)",
      definition:
        "가격 계산기가 4 입력 (어셋 수·시즌·시장·독점) 을 매핑한 5 캠페인 구조 중 하나 — Traditional competitive, License daily, Paired editorial brand-kit, Season anchor brand-kit, Custom build. 각 path 는 다른 unit economics 와 라이선스 구조. buyer 의 스코프에 맞는 path 를 사전 판단해 over-buying / under-scoping 방지.",
    },
    en: {
      term: "Recommended path",
      definition:
        "One of five campaign structures the pricing calculator maps your 4 inputs (assets, season weeks, markets, exclusivity) onto — Traditional competitive, License daily, Paired editorial brand-kit, Season anchor brand-kit, or Custom build. Each path has different unit economics and licensing structure; the recommendation prevents both over-buying and under-scoping.",
    },
    relatedPostSlug: "inside-the-pricing-calculator-4-inputs",
  },
  {
    slug: "asset-to-media-ratio",
    category: "commercial",
    ko: {
      term: "어셋 대 미디어 비율 (Asset-to-media ratio)",
      definition:
        "캠페인의 어셋 + 라이선스 비용 대비 미디어 예산 비율. 건강한 비율은 1:3 ~ 1:5 — 그 아래면 over-production (제작 어셋의 60% 가 실제 운영 안 됨), 위면 under-production (미디어가 5 어셋을 반복 노출해 fatigue + CPM creep). 가격 계산기로 어셋 견적 후 미디어 예산을 역산할 때 사용.",
    },
    en: {
      term: "Asset-to-media ratio",
      definition:
        "The ratio of your asset + licensing budget to your media buy. A healthy band is 1:3 to 1:5 — below that, you're over-producing (60% of assets won't actually run); above it, you're under-producing (media fatigue and CPM creep from rotating only 5 assets). Useful for reverse-deriving media budget from a calculator estimate.",
    },
    relatedPostSlug: "total-campaign-cost-decomposition",
  },
  {
    slug: "tier-upgrade-trigger",
    category: "commercial",
    ko: {
      term: "티어 업그레이드 트리거 (Tier upgrade trigger)",
      definition:
        "광고주가 paired → season → custom 으로 옮겨야 하는 신호 (캠페인 16 주 이상 연장, 다시장 확장, 분기 캐던스, 카테고리 독점 경합, 브랜드 보이스 미스핏, 6+ SKU 동시 출범). 「예산이 늘었다」가 아니라 「캠페인 형태가 바뀌었다」가 진짜 트리거. 신호 없이 미리 업티어하면 옵셔널리티 낭비.",
    },
    en: {
      term: "Tier upgrade trigger",
      definition:
        "A documented signal that the campaign shape has outgrown the current brand-kit tier — campaign extending past 16 weeks, cross-market expansion, quarterly cadence, category exclusivity contested, brand voice misfit, or 6+ SKU rollout. «More budget» is not a trigger; «different campaign shape» is. Upgrading without a trigger wastes optionality.",
    },
    relatedPostSlug: "brand-kit-upgrade-path-when-to-move-tiers",
    relatedPostSlugKo: "brand-kit-upgrade-path-ko",
  },
  {
    slug: "acceptance-qa",
    category: "workflow",
    ko: {
      term: "납품 검수 (Acceptance QA)",
      definition:
        "광고주가 인보이스 결제 전 직접 실행하는 검수 단계 — 얼굴 일관성·손/제품 접점·의상 컨티뉴이티·디스클로저 메타데이터·포맷 커버리지·라이선스 스코프·소스 어테스테이션·리비전 속도 SLA. 벤더가 흐릿하게 둔 «approve and ship» 단계를 광고주 측에서 구조화한 게이트로 바꿔 결제 후 후회를 줄이는 buyer-side 안전망.",
    },
    en: {
      term: "Acceptance QA",
      definition:
        "The buyer-controlled verification step before invoice payment — face consistency, hand/product contact points, wardrobe continuity, disclosure metadata, format coverage, license scope, source attestation, revision velocity SLA. Converts the vendor's vague «approve and ship» step into a structured gate, reducing post-payment regret. A buyer-side safety net the vendor benefits from too (clearer acceptance = faster sign-off).",
    },
    relatedPostSlug: "synthetic-talent-qa-checklist-before-paying",
    relatedPostSlugKo: "synthetic-talent-qa-checklist-ko",
  },
  {
    slug: "license-brand-kit-break-even",
    category: "commercial",
    ko: {
      term: "라이선스-브랜드 키트 손익분기점 (License-brand-kit break-even)",
      definition:
        "일별 라이선스가 paired 브랜드 키트보다 싸지 않게 되는 어셋 수 임계점 — 포맷 커버리지 포함 약 14 hero 컷. 그 이상에선 paired 가, 약 40 컷 이상에선 Season 이 결정적. 라이선스의 단위 비용 (일당) 이 작은 숫자라 「더 싸다」고 잘못 인식되지만, 촬영일 × 포맷 × 리비전이 compound 되어 임계점을 넘기면 빠르게 paired 가 우위.",
    },
    en: {
      term: "License–brand-kit break-even",
      definition:
        "The asset-count threshold beyond which per-day license stops being cheaper than a paired brand kit — roughly 14 hero frames with format coverage. Past that, paired wins; past ~40, Season wins decisively. The license unit cost (per-day) is the visible number that anchors «cheaper» intuition, but shoot-day × format coverage × revision cycles compound and the line crosses faster than buyers expect.",
    },
    relatedPostSlug: "license-vs-brand-kit-break-even-worked-example",
    relatedPostSlugKo: "license-vs-brand-kit-break-even-worked-example-ko",
  },
  {
    slug: "format-coverage",
    category: "workflow",
    ko: {
      term: "포맷 커버리지 (Format coverage)",
      definition:
        "캠페인이 요구하는 채널별 종횡비 + 시장별 변형의 매트릭스 — PDP (1:1), 릴스 (9:16), IG 피드 (4:5), hero/비디오 (16:9), 옥외 (wide). 각 hero 컷이 «포맷 N 개» 로 변형되어 실제 deliverable 수가 hero 수 × 포맷 배수가 됨. 견적 단계에서 포맷 커버리지를 빠뜨리면 라이선스가 paired 보다 저렴해 보이는 착시를 만들고, 손익분기 계산을 망가뜨림.",
    },
    en: {
      term: "Format coverage",
      definition:
        "The matrix of aspect ratios + market variants a campaign requires — PDP (1:1), reels (9:16), IG feed (4:5), hero/video (16:9), OOH (wide). Each hero frame becomes «N format variants», so the realized deliverable count is hero count × format multiplier. Omitting format coverage from the quote creates the illusion that per-day license beats paired, distorting the break-even math.",
    },
    relatedPostSlug: "cross-market-localization-checklist-kr-us-eu-sg",
    relatedPostSlugKo: "cross-market-localization-checklist-kr-us-eu-sg-ko",
  },
  {
    slug: "training-data-attestation",
    category: "compliance",
    ko: {
      term: "학습 데이터 어테스테이션 (Training-data attestation)",
      definition:
        "합성 캐릭터가 식별 가능한 실제 인물과 likeness-similarity threshold 내에서 일치하지 않음을 벤더가 서명하는 서면 진술. EU AI Act 가 일부 시장에서 명시적으로 요구; US (NIL — Name/Image/Likeness 강화 추세), 한국 (퍼블리시티권 jurisprudence 강화) 도 사실상 필수. 인보이스 결제 전에 받아두면 downstream right-of-publicity 클레임으로부터 광고주를 보호.",
    },
    en: {
      term: "Training-data attestation",
      definition:
        "A vendor-signed written statement that the synthetic character does not match any identifiable real person within a likeness-similarity threshold. EU AI Act mandates it in some markets; US NIL (Name/Image/Likeness) enforcement and Korea's hardened 퍼블리시티권 jurisprudence make it effectively required everywhere. Obtain before invoice payment to protect the brand from downstream right-of-publicity claims.",
    },
    relatedPostSlug: "synthetic-campaign-failure-modes-how-to-catch",
  },
  {
    slug: "revision-velocity-sla",
    category: "workflow",
    ko: {
      term: "리비전 속도 SLA (Revision velocity SLA)",
      definition:
        "결정 → 동일 캐릭터 변형 납품의 turnaround time 을 벤더가 서면으로 commit 하는 표준. 우리 내부 목표는 48 시간; 평판 좋은 벤더는 숫자를 SoW 에 명시하고 dashboard 로 백업. 합성 탤런트가 전통 촬영보다 빠르다는 advantage 의 핵심 입증 — 속도 약속 못 하는 벤더는 렌더링 컴퓨트가 추가된 느린 어셋 샵에 불과.",
    },
    en: {
      term: "Revision velocity SLA",
      definition:
        "A written vendor commitment on turnaround time (decision → delivery for a same-character variant). Our internal target is 48h; reputable vendors publish the number in the SoW and back it with a track-record dashboard. The core proof that synthetic talent is faster than traditional shoots — vendors who can't commit are just slow asset shops with extra rendering compute.",
    },
    relatedPostSlug: "synthetic-campaign-failure-modes-how-to-catch",
  },
  {
    slug: "license-scope-in-writing",
    category: "commercial",
    ko: {
      term: "서면 라이선스 스코프 (License scope in writing)",
      definition:
        "결제 전 인보이스 또는 동봉 라이선스 PDF 가 명시해야 하는 5 필드 — 사용권 (유료 미디어/오가닉/OOH/POS), 영역, 기간, 독점, 채널 제한. 구두 핸드셰이크하는 벤더는 새 시장·채널 진입 시 surprise fee 준비 중. 다른 벤더 떠나는 광고주 인콰이어에서 가장 흔한 분쟁의 원인.",
    },
    en: {
      term: "License scope in writing",
      definition:
        "The 5 fields the invoice or accompanying license PDF must enumerate before payment — usage rights (paid media / organic / OOH / POS), territories, duration, exclusivity, channel limits. Vendors who handshake the license verbally are setting up surprise fees at the next market or channel expansion. The most common dispute we see in inquiries from buyers leaving other vendors.",
    },
    relatedPostSlug: "synthetic-campaign-failure-modes-how-to-catch",
  },
  {
    slug: "campaign-refresh-cadence",
    category: "workflow",
    ko: {
      term: "캠페인 리프레시 cadence (Campaign refresh cadence)",
      definition:
        "캐릭터를 시장에서 fresh 하게 유지하기 위해 신규 hero 어셋·포즈·시즌 컨텍스트를 추가하는 정기 사이클. Paired tier 의 디폴트는 분기당 1 회 (6 어셋); season tier 는 quarterly + 연 1 회 narrative refresh; custom 은 월 단위 가능. 4 개월 초과 캠페인에서 fatigue 방지의 핵심 메커니즘 — 리프레시 없는 캠페인은 평균 6 주차부터 rotation 건강도 무너짐. 계약 체결 시점에 cadence 가 SoW 에 명시되어야 (post-hoc 추가는 비싸짐).",
    },
    en: {
      term: "Campaign refresh cadence",
      definition:
        "The scheduled cycle for adding new hero assets, poses, and seasonal contexts to keep the character fresh in market. Paired tier defaults to once per quarter (6 assets); season tier is quarterly + one annual narrative refresh; custom can be monthly. The core mechanism preventing fatigue past month 4 — campaigns without refresh allocations average rotation-health collapse by week 6. The cadence must be specified in the SoW at contract signing (adding it post-hoc gets expensive).",
    },
    relatedPostSlug: "brand-kit-first-year-pnl-what-buyers-actually-get",
  },
  {
    slug: "delivery-format-pack",
    category: "product",
    ko: {
      term: "납품 포맷 팩 (Delivery format pack)",
      definition:
        "어셋이 캠페인에 사용 가능하도록 컨셉당 출하되는 표준 종횡비 묶음 — 1:1 (PDP), 9:16 (릴스/숏폼), 4:5 (IG 피드), 16:9 (hero/비디오), OOH wide (옥외). 각 포맷은 의도적 구성 (deliberate composition) 이어야 — hero 의 center-crop 아님. 포맷 팩이 brief 에서 약속한 것에 매칭하는지가 QA checklist 의 Check 5; 미스매치는 «brand-kit 티어 가격에 이미 포함됐는데 lazy 출하» 의 시그널.",
    },
    en: {
      term: "Delivery format pack",
      definition:
        "The standard aspect-ratio bundle delivered per concept so the asset is campaign-ready — 1:1 (PDP), 9:16 (reels/shorts), 4:5 (IG feed), 16:9 (hero/video), OOH wide (out-of-home). Each format should be a deliberate composition, not a center-crop of the hero. Format-pack coverage matching the brief is QA checklist Check 5; mismatch signals «you already paid for it in the brand-kit tier and the vendor shipped lazily».",
    },
    relatedPostSlug: "synthetic-talent-qa-checklist-before-paying",
    relatedPostSlugKo: "synthetic-talent-qa-checklist-ko",
  },
  {
    slug: "synthetic-human-ratio",
    category: "commercial",
    ko: {
      term: "합성/인간 ratio (Synthetic/human ratio)",
      definition:
        "캠페인 어셋 spend 중 합성 탤런트 vs 인간 탤런트 분배. 3 표준: 80/20 (브랜드 surface 위주, D2C·K-aesthetic·e-commerce), 60/40 (균형, 기존 브랜드·B2B-leaning premium), 40/60 (trust-led, 금융·헬스케어·premium hospitality). 1 년 lock 아닌 분기 dial — 시장 확장·런칭 quarter·시즌 anchor 마다 조정. 가장 흔한 실수는 실 spend audit 안 하고 추측으로 ratio 설정.",
    },
    en: {
      term: "Synthetic/human ratio",
      definition:
        "The split of campaign asset spend between synthetic and human talent. Three published ratios: 80/20 (brand-surface heavy: D2C, K-aesthetic, e-commerce), 60/40 (balanced flagship: established brands, B2B-leaning premium), 40/60 (trust-led: financial services, healthcare-adjacent, premium hospitality). Not a yearly lock but a quarterly dial — adjust with market expansion / launch quarter / seasonal anchor. The most common mistake is setting the ratio by guess without auditing actual spend.",
    },
    relatedPostSlug: "synthetic-human-balanced-media-mix-when-to-shift-ratios",
  },
  {
    slug: "pre-inquiry-self-check",
    category: "workflow",
    ko: {
      term: "인콰이어 전 셀프체크 (Pre-inquiry self-check)",
      definition:
        "광고주가 벤더 인콰이어 보내기 전 15 분 내 완료해야 할 4 질문: (1) 합성 탤런트 fit 여부 (라이브·creator·셀러브리티 premise 면 wrong tool), (2) 마케팅·법무·브랜드·재무 내부 yes (날짜 stamp), (3) 숫자 success criterion (예: «+10 % assisted conversion lift»), (4) 90 분 QA 윈도우 (sign-off 48 시간 전, owner + 차단됨). 빠진 답이 있으면 인콰이어 보내지 말고 upstream 작업 — 벤더가 unblock 못 함. 6-8 주 kickoff 윈도우를 2-3 주로 압축.",
    },
    en: {
      term: "Pre-inquiry self-check",
      definition:
        "A 4-question 15-minute diligence the buyer should complete before sending a vendor inquiry: (1) synthetic-talent fit (live / creator / celebrity-equivalent premise = wrong tool); (2) marketing / legal / brand / finance internal yeses (date-stamped); (3) numerical success criterion (e.g., «+10% assisted conversion lift»); (4) 90-minute QA window (48 hours before sign-off, owner + blocked time). If any answer is missing, work upstream — don't send the inquiry; the vendor can't unblock you. Compresses the typical 6-8 week kickoff into 2-3 weeks.",
    },
    relatedPostSlug: "buyer-self-check-before-inquiry-4-questions",
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
