import type { IndustryTag, GenreTag, MoodTag } from "@/types";

export const INDUSTRY_OPTIONS: { value: IndustryTag; label: string }[] = [
  { value: "beauty", label: "뷰티" },
  { value: "tech", label: "테크" },
  { value: "food", label: "푸드" },
  { value: "luxury", label: "럭셔리" },
  { value: "sports", label: "스포츠" },
  { value: "lifestyle", label: "라이프스타일" },
];

export const GENRE_OPTIONS: { value: GenreTag; label: string }[] = [
  { value: "ad", label: "광고" },
  { value: "film", label: "영화" },
  { value: "drama", label: "드라마" },
  { value: "noir", label: "누아르" },
  { value: "romance", label: "로맨스" },
  { value: "sci-fi", label: "SF" },
  { value: "historical", label: "사극" },
  { value: "indie", label: "독립영화" },
  { value: "horror", label: "공포" },
];

export const MOOD_OPTIONS: { value: MoodTag; label: string }[] = [
  { value: "cold", label: "차가운" },
  { value: "warm", label: "따뜻한" },
  { value: "neutral", label: "중성적" },
  { value: "edgy", label: "엣지있는" },
];

export const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  INDUSTRY_OPTIONS.map((o) => [o.value, o.label])
);

export const GENRE_LABELS: Record<string, string> = Object.fromEntries(
  GENRE_OPTIONS.map((o) => [o.value, o.label])
);

export const MOOD_LABELS: Record<string, string> = Object.fromEntries(
  MOOD_OPTIONS.map((o) => [o.value, o.label])
);
