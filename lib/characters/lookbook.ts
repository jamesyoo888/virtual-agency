/**
 * Lookbook concept-sheet skeleton — what a quarterly brand-kit ships against.
 *
 * Real assets land per quarter; until then the lookbook page renders this
 * structured outline so brand teams can see exactly what they'll get
 * (5 concept sheets per character, each with mood / wardrobe / lighting /
 * sample-shot count / disclosure metadata) and decide whether to commission.
 */

import type { CharacterSlug } from "./registry";

export interface ConceptSheet {
  /** Stable id used as anchor. */
  id: string;
  /** Concept title in KR. */
  titleKo: string;
  /** Concept title in EN. */
  titleEn: string;
  /** One-line concept brief in KR. */
  briefKo: string;
  /** One-line concept brief in EN. */
  briefEn: string;
  /** Mood anchors (3 words). */
  mood: string[];
  /** Wardrobe register summary. */
  wardrobeKo: string;
  wardrobeEn: string;
  /** Lighting recipe. */
  lighting: string;
  /** Number of finished hero shots delivered. */
  heroShots: number;
  /** Number of supporting shots delivered. */
  supportingShots: number;
  /**
   * Optional public-URL list of rendered hero/supporting frames.
   *
   * Stays undefined (or empty) for unrendered concepts — the lookbook page
   * then falls back to placeholder slots. Once asset URLs land (CDN / Blob /
   * Supabase storage), wiring them here surfaces the actual frames without
   * any page-level code changes.
   *
   * Order: hero shots first, then supporting shots. The page slices by
   * heroShots / supportingShots so the split is deterministic.
   */
  imageUrls?: string[];
}

/**
 * How many concrete frames are wired for a concept.
 *
 * Exposed for tests + the lookbook page so we can render either real
 * frames or placeholder slots without each call site re-implementing the
 * trim/clamp logic.
 */
export function conceptRenderedCount(sheet: ConceptSheet): number {
  if (!sheet.imageUrls) return 0;
  return sheet.imageUrls.filter((u) => typeof u === "string" && u.length > 0)
    .length;
}

export interface ConceptFrameSlot {
  /** Public URL when an asset is wired, null when still a placeholder slot. */
  url: string | null;
  role: "hero" | "supporting";
}

/**
 * Expand a concept sheet into hero + supporting slots, filling concrete
 * URLs from imageUrls and padding with placeholder nulls to match the
 * declared heroShots / supportingShots count.
 */
export function conceptFrameSlots(sheet: ConceptSheet): ConceptFrameSlot[] {
  const urls = (sheet.imageUrls ?? []).filter(
    (u): u is string => typeof u === "string" && u.length > 0
  );
  const slots: ConceptFrameSlot[] = [];
  for (let i = 0; i < sheet.heroShots; i++) {
    slots.push({ url: urls[i] ?? null, role: "hero" });
  }
  for (let i = 0; i < sheet.supportingShots; i++) {
    slots.push({
      url: urls[sheet.heroShots + i] ?? null,
      role: "supporting",
    });
  }
  return slots;
}

export const LOOKBOOK_CONCEPTS: Record<CharacterSlug, ConceptSheet[]> = {
  yuna: [
    {
      id: "yuna-glass-morning",
      titleKo: "글래스 모닝",
      titleEn: "Glass Morning",
      briefKo:
        "오전 자연광에서 듀이 글래스 스킨을 강조하는 뷰티 헤로 컬렉션.",
      briefEn:
        "Beauty hero set built on dewy glass-skin in soft morning daylight.",
      mood: ["clean", "soft", "fresh"],
      wardrobeKo: "크림 코튼 셔츠, 미니멀 골드 액세서리.",
      wardrobeEn: "Cream cotton shirt, minimal gold accessory.",
      lighting: "5500K window key + cream bounce, no overhead fill.",
      heroShots: 6,
      supportingShots: 12,
    },
    {
      id: "yuna-monochrome-editorial",
      titleKo: "모노크롬 에디토리얼",
      titleEn: "Monochrome Editorial",
      briefKo:
        "흑백·모노톤 룩 4종으로 럭셔리 패션 매거진 캐스팅 자세로 구성.",
      briefEn:
        "Four monochrome looks in luxury-magazine casting poses.",
      mood: ["cold", "restrained", "premium"],
      wardrobeKo: "오버사이즈 울 코트, 슬림 트라우저, 단일 앵커 컬러.",
      wardrobeEn: "Oversized wool coat, slim trouser, single anchor color.",
      lighting: "Cool key with deeper shadow fall, warm rim.",
      heroShots: 4,
      supportingShots: 8,
    },
    {
      id: "yuna-tech-lifestyle",
      titleKo: "테크 라이프스타일",
      titleEn: "Tech Lifestyle",
      briefKo:
        "스마트홈·웨어러블 브랜드 일상 사용 컷, 손·디바이스 클로즈업 포함.",
      briefEn:
        "Daily-use moments for smart-home / wearable brands, with hand and device close-ups.",
      mood: ["calm", "modern", "natural"],
      wardrobeKo: "뉴트럴 톤 니트, 단정한 데님.",
      wardrobeEn: "Neutral knit, clean denim.",
      lighting: "Daylight diffuse + accent practical (device glow).",
      heroShots: 5,
      supportingShots: 10,
    },
    {
      id: "yuna-night-luxury",
      titleKo: "나이트 럭셔리",
      titleEn: "Night Luxury",
      briefKo:
        "주얼리·향수 캠페인용 저녁 톤, 와인 액센트 컬러.",
      briefEn:
        "Evening register for jewellery / fragrance campaigns, wine accent.",
      mood: ["sensual", "premium", "warm"],
      wardrobeKo: "딥 와인 새틴 슬립, 골드 펜던트.",
      wardrobeEn: "Deep wine satin slip, gold pendant.",
      lighting: "Single warm key (3200K) + subtle blue rim.",
      heroShots: 4,
      supportingShots: 6,
    },
    {
      id: "yuna-street-seoul",
      titleKo: "스트리트 서울",
      titleEn: "Street Seoul",
      briefKo:
        "성수·이태원 톤의 모던 스트리트 캐주얼, 데일리 무드보드.",
      briefEn:
        "Modern Seoul street register (Seongsu / Itaewon mood) for daily moodboards.",
      mood: ["effortless", "modern", "neutral"],
      wardrobeKo: "오버사이즈 자켓, 슬림 트라우저, 화이트 스니커.",
      wardrobeEn: "Oversized jacket, slim trouser, white sneaker.",
      lighting: "Mixed daylight + reflected city light.",
      heroShots: 5,
      supportingShots: 10,
    },
  ],
  ren: [
    {
      id: "ren-noir-fragrance",
      titleKo: "느와르 향수",
      titleEn: "Noir Fragrance",
      briefKo:
        "딥 그래파이트 톤 향수 캠페인. 하이 컨트라스트 절제.",
      briefEn:
        "Deep-graphite fragrance campaign — high-contrast restrained.",
      mood: ["sharp", "premium", "masculine"],
      wardrobeKo: "테일러드 코트, 구조적 셔팅.",
      wardrobeEn: "Tailored coat, structured shirting.",
      lighting:
        "Cool directional key, deep shadow fall, warm rim. Pull-toward-noir without crush.",
      heroShots: 6,
      supportingShots: 10,
    },
    {
      id: "ren-watch-detail",
      titleKo: "워치 디테일",
      titleEn: "Watch Detail",
      briefKo:
        "스위스 메이커 시계 캠페인. 손목·아이 컨택트·시계 클로즈업.",
      briefEn:
        "Swiss-maker watch campaign — wrist, eye contact, watch close-up.",
      mood: ["precise", "luxury", "calm"],
      wardrobeKo: "차콜 수트, 무광 실버 커프링크.",
      wardrobeEn: "Charcoal suit, matte silver cufflinks.",
      lighting: "Soft 4500K key, controlled specular for watch face.",
      heroShots: 4,
      supportingShots: 12,
    },
    {
      id: "ren-motor-sport",
      titleKo: "모터 스포츠",
      titleEn: "Motor Sport",
      briefKo:
        "그랜투리스모·모터스포츠 라이프스타일. 환경 컷·웨어 클로즈업.",
      briefEn:
        "Gran-turismo / motorsport lifestyle — environment + wear close-up.",
      mood: ["kinetic", "premium", "warm"],
      wardrobeKo: "테크니컬 자켓, 타이트 데님.",
      wardrobeEn: "Technical jacket, tight denim.",
      lighting: "Practical environment + warm rim on edge.",
      heroShots: 5,
      supportingShots: 10,
    },
    {
      id: "ren-menswear-editorial",
      titleKo: "멘즈웨어 에디토리얼",
      titleEn: "Menswear Editorial",
      briefKo:
        "젠더 플루이드 스타일링 4종, 럭셔리 멘즈웨어 매거진 톤.",
      briefEn:
        "Four gender-fluid styled looks in luxury-menswear editorial tone.",
      mood: ["composed", "modern", "neutral"],
      wardrobeKo: "구조적 셔트, 와이드 트라우저, 단정한 액세서리.",
      wardrobeEn: "Structured shirt, wide trouser, restrained accessory.",
      lighting: "Cool key + crisp rim, neutral fill.",
      heroShots: 4,
      supportingShots: 8,
    },
    {
      id: "ren-with-yuna",
      titleKo: "유나와 페어",
      titleEn: "Paired with Yuna",
      briefKo:
        "공통 스타일링 DNA 로 페어 캠페인 4 컷 (커플 내러티브 / 크로스젠더 캐스팅).",
      briefEn:
        "Four paired-campaign shots with shared styling DNA (couple narrative / cross-gender casting).",
      mood: ["calm", "premium", "neutral"],
      wardrobeKo: "동일 팔레트 (그래파이트·아이보리·와인 액센트).",
      wardrobeEn: "Shared palette (graphite, ivory, wine accent).",
      lighting: "Same key/rim recipe applied across both subjects.",
      heroShots: 4,
      supportingShots: 8,
    },
  ],
};

export function lookbookForCharacter(slug: CharacterSlug): ConceptSheet[] {
  return LOOKBOOK_CONCEPTS[slug] ?? [];
}
