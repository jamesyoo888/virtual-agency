import type { GenreTag, MoodTag } from "@/types";

interface Copy {
  heroTitle: string;
  heroLede: string;
  seoDescription: string;
}

export const MOOD_COPY: Record<MoodTag, Copy> = {
  cold: {
    heroTitle: "차가운 분위기의 AI 버추얼 모델",
    heroLede:
      "모노톤·미니멀·시크. 럭셔리 패션, 테크 브랜드, 차가운 톤의 광고에 적합.",
    seoDescription:
      "차가운 분위기에 어울리는 AI 버추얼 모델 카탈로그.",
  },
  warm: {
    heroTitle: "따뜻한 분위기의 AI 버추얼 모델",
    heroLede:
      "친근하고 부드러운 무드. 라이프스타일, 푸드, 패밀리 캠페인에 적합.",
    seoDescription:
      "따뜻한 분위기의 AI 버추얼 모델. 일상·라이프스타일 캠페인 모델 라이선싱.",
  },
  neutral: {
    heroTitle: "중성적인 무드의 AI 버추얼 모델",
    heroLede:
      "어떤 브랜드에도 잘 어울리는 범용 무드. 다양한 컨셉 전환에 강합니다.",
    seoDescription:
      "중성적인 무드의 AI 버추얼 모델 카탈로그. 다양한 캠페인에 활용.",
  },
  edgy: {
    heroTitle: "엣지있는 AI 버추얼 모델",
    heroLede:
      "강렬한 임팩트, 스트리트 무드, 도전적인 비주얼. 영화·하이엔드 패션에 적합.",
    seoDescription:
      "엣지있고 강렬한 무드의 AI 버추얼 모델. 임팩트 캠페인 모델 라이선싱.",
  },
};

export const GENRE_COPY: Record<GenreTag, Copy> = {
  ad: {
    heroTitle: "광고에 최적화된 AI 버추얼 모델",
    heroLede:
      "TVC, SNS 캠페인, 디지털 광고. 광고 톤에 맞춰 캐스팅된 모델들.",
    seoDescription:
      "광고 캠페인용 AI 버추얼 모델 카탈로그. TVC·SNS 광고 모델 라이선싱.",
  },
  film: {
    heroTitle: "영화 비주얼의 AI 버추얼 모델",
    heroLede:
      "영화적인 톤·심도·연출. 짧은 필름 콘텐츠, 시네마틱 광고에 적합.",
    seoDescription:
      "시네마틱 무드의 AI 버추얼 모델 카탈로그.",
  },
  drama: {
    heroTitle: "드라마 분위기의 AI 버추얼 모델",
    heroLede: "감정선이 깊고 표정이 풍부한 모델들. 시리즈물·캠페인 영상에 적합.",
    seoDescription:
      "드라마 감성 AI 버추얼 모델 카탈로그.",
  },
  noir: {
    heroTitle: "누아르 무드의 AI 버추얼 모델",
    heroLede: "흑백 명암, 차가운 빛, 어두운 골목. 강한 비주얼 임팩트가 필요할 때.",
    seoDescription: "누아르 비주얼 AI 버추얼 모델 카탈로그.",
  },
  romance: {
    heroTitle: "로맨스 분위기의 AI 버추얼 모델",
    heroLede: "따뜻하고 감미로운 톤. 화장품·웨딩·향수 캠페인에 적합.",
    seoDescription: "로맨틱 무드의 AI 버추얼 모델 카탈로그.",
  },
  "sci-fi": {
    heroTitle: "SF 무드의 AI 버추얼 모델",
    heroLede: "미래지향적 비주얼, 사이버펑크, 메타버스. 테크·게임 캠페인에.",
    seoDescription: "SF·사이버펑크 비주얼 AI 버추얼 모델 카탈로그.",
  },
  historical: {
    heroTitle: "사극 무드의 AI 버추얼 모델",
    heroLede: "한복·전통 의상에 어울리는 모델. 문화 콘텐츠·관광·박물관 캠페인.",
    seoDescription: "사극·전통 무드 AI 버추얼 모델 카탈로그.",
  },
  indie: {
    heroTitle: "독립영화 분위기의 AI 버추얼 모델",
    heroLede: "자연광·소박한 톤·일상 감성. 인디 브랜드·소규모 캠페인에 적합.",
    seoDescription: "독립영화 감성 AI 버추얼 모델 카탈로그.",
  },
  horror: {
    heroTitle: "공포 무드의 AI 버추얼 모델",
    heroLede: "어두운 톤·미스터리한 분위기. 시즌 한정 캠페인·게임에 적합.",
    seoDescription: "공포·미스터리 무드 AI 버추얼 모델 카탈로그.",
  },
};

// English mirrors — same shape, K-aesthetic-aware voice for global brands.
export const MOOD_COPY_EN: Record<MoodTag, Copy> = {
  cold: {
    heroTitle: "Cool-mood AI Virtual Models",
    heroLede:
      "Mono, minimal, K-aesthetic editorial. Luxury fashion, tech, premium beauty — built for restraint.",
    seoDescription:
      "Cool-mood AI virtual models for luxury, tech, and premium campaigns. K-aesthetic editorial lighting native.",
  },
  warm: {
    heroTitle: "Warm-mood AI Virtual Models",
    heroLede:
      "Soft, dewy, approachable. Lifestyle, F&B, family-oriented K-beauty campaigns.",
    seoDescription:
      "Warm-mood AI virtual models for lifestyle and K-beauty campaigns. Dewy glass-skin lighting on demand.",
  },
  neutral: {
    heroTitle: "Neutral-mood AI Virtual Models",
    heroLede:
      "Versatile across brand contexts. Strong for multi-concept catalog rollouts and seasonal pivots.",
    seoDescription:
      "Neutral-mood AI virtual models for catalog rollouts and multi-concept campaigns.",
  },
  edgy: {
    heroTitle: "Edgy AI Virtual Models",
    heroLede:
      "Sharp K-street style, high-impact, editorial-with-bite. Film, hi-end fashion, statement campaigns.",
    seoDescription:
      "Edgy AI virtual models for high-impact campaigns, film, and editorial K-fashion.",
  },
};

export const GENRE_COPY_EN: Record<GenreTag, Copy> = {
  ad: {
    heroTitle: "Advertising-optimized AI Virtual Models",
    heroLede:
      "TVC, social campaigns, digital ads. Casting tuned to ad rhythm and brand voice.",
    seoDescription:
      "AI virtual models cast for TV, social, and digital advertising campaigns.",
  },
  film: {
    heroTitle: "Cinematic AI Virtual Models",
    heroLede:
      "Film tone, depth, K-cinema palette. Short-form film content and cinematic ads.",
    seoDescription:
      "Cinematic AI virtual models with K-aesthetic film-tone palettes.",
  },
  drama: {
    heroTitle: "Drama-mood AI Virtual Models",
    heroLede:
      "Expressive faces, emotional range. K-drama-coded talent for serial content and brand storytelling.",
    seoDescription:
      "K-drama-coded AI virtual models for serial campaigns and brand storytelling.",
  },
  noir: {
    heroTitle: "Noir AI Virtual Models",
    heroLede:
      "Hard light, deep shadow, cool monochrome. When you need visual impact, not warmth.",
    seoDescription:
      "Noir-style AI virtual models for high-contrast, mood-forward campaigns.",
  },
  romance: {
    heroTitle: "Romance-mood AI Virtual Models",
    heroLede:
      "Soft, warm, K-beauty-adjacent. Fragrance, weddings, romance-coded F&B.",
    seoDescription:
      "Romance-mood AI virtual models for fragrance, wedding, and K-beauty-adjacent campaigns.",
  },
  "sci-fi": {
    heroTitle: "Sci-Fi AI Virtual Models",
    heroLede:
      "Future-forward, cyberpunk, metaverse-coded. Tech, gaming, immersive campaigns.",
    seoDescription:
      "Sci-fi AI virtual models for tech, gaming, and future-forward campaigns.",
  },
  historical: {
    heroTitle: "Historical-mood AI Virtual Models",
    heroLede:
      "Traditional Korean dress, court-era styling. Culture, tourism, museum-grade brand work.",
    seoDescription:
      "Historical-mood AI virtual models styled for Korean tradition and cultural campaigns.",
  },
  indie: {
    heroTitle: "Indie AI Virtual Models",
    heroLede:
      "Natural light, lived-in tone, K-indie aesthetic. Small-batch brand work and editorial.",
    seoDescription:
      "Indie-mood AI virtual models with K-indie editorial aesthetic.",
  },
  horror: {
    heroTitle: "Horror-mood AI Virtual Models",
    heroLede:
      "Dark tones, mystery, K-horror visual codes. Seasonal limited campaigns and gaming.",
    seoDescription:
      "Horror-mood AI virtual models for K-horror-coded seasonal campaigns and gaming.",
  },
};
