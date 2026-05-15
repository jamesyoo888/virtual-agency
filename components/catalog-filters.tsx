"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  INDUSTRY_OPTIONS as INDUSTRIES,
  GENRE_OPTIONS as GENRES,
  MOOD_OPTIONS as MOODS,
} from "@/lib/tags";
import { SORT_OPTIONS } from "@/lib/catalog/filter";

interface Props {
  current: {
    industry?: string;
    genre?: string;
    mood?: string;
    price_max?: string;
    exclusive?: string;
    sort?: string;
  };
}

const FILTER_KEYS = ["industry", "genre", "mood", "price_max", "exclusive", "sort"] as const;

export default function CatalogFilters({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    // Start from the full current URL so search ?q= and other params are preserved
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function reset() {
    // Only strip filter keys; keep ?q= and anything else
    const params = new URLSearchParams(searchParams.toString());
    for (const k of FILTER_KEYS) params.delete(k);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-400">정렬</Label>
        <Select
          value={current.sort ?? "popular"}
          onValueChange={(v) => update("sort", v ?? "")}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-sm">
            <SelectValue placeholder="인기순" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
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
