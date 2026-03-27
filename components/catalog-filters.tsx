"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const INDUSTRIES = [
  { value: "beauty", label: "뷰티" },
  { value: "tech", label: "테크" },
  { value: "food", label: "푸드" },
  { value: "luxury", label: "럭셔리" },
  { value: "sports", label: "스포츠" },
  { value: "lifestyle", label: "라이프스타일" },
];

const GENRES = [
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

const MOODS = [
  { value: "cold", label: "차가운" },
  { value: "warm", label: "따뜻한" },
  { value: "neutral", label: "중성적" },
  { value: "edgy", label: "엣지있는" },
];

interface Props {
  current: {
    industry?: string;
    genre?: string;
    mood?: string;
    price_max?: string;
    exclusive?: string;
  };
}

export default function CatalogFilters({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (current.industry) params.set("industry", current.industry);
    if (current.genre) params.set("genre", current.genre);
    if (current.mood) params.set("mood", current.mood);
    if (current.price_max) params.set("price_max", current.price_max);
    if (current.exclusive) params.set("exclusive", current.exclusive);

    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    router.push(pathname);
  }

  const hasFilters = !!(
    current.industry || current.genre || current.mood ||
    current.price_max || current.exclusive
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3">필터</h3>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">산업</Label>
        <Select
          value={current.industry ?? "all"}
          onValueChange={(v) => update("industry", v ?? "")}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">전체</SelectItem>
            {INDUSTRIES.map((i) => (
              <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">장르</Label>
        <Select
          value={current.genre ?? "all"}
          onValueChange={(v) => update("genre", v ?? "")}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">전체</SelectItem>
            {GENRES.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">분위기</Label>
        <Select
          value={current.mood ?? "all"}
          onValueChange={(v) => update("mood", v ?? "")}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">전체</SelectItem>
            {MOODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">독점 가능</Label>
        <Select
          value={current.exclusive ?? "all"}
          onValueChange={(v) => update("exclusive", v ?? "")}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="true">독점 가능만</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-zinc-500 hover:text-white text-xs"
          onClick={reset}
        >
          필터 초기화
        </Button>
      )}
    </div>
  );
}
