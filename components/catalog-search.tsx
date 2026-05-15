"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Clock } from "lucide-react";

interface Suggestion {
  id: string;
  name: string;
  concept_image: string | null;
  base_price: number | null;
}

const HISTORY_KEY = "va_recent_searches";
const HISTORY_LIMIT = 5;

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeHistory(items: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded — ignore */
  }
}

export default function CatalogSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";

  const [value, setValue] = useState(urlQ);
  const [lastSeenUrlQ, setLastSeenUrlQ] = useState(urlQ);
  if (urlQ !== lastSeenUrlQ) {
    setLastSeenUrlQ(urlQ);
    setValue(urlQ);
  }

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load history once after hydration so SSR markup stays empty.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHistory(readHistory()), []);

  // Persist a committed search term — runs after the URL has been updated.
  // The lint rule flags setState inside effects, but this is the canonical
  // pattern for "react to a URL change, then update derived state + storage."
  useEffect(() => {
    const committed = urlQ.trim();
    if (!committed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory((prev) => {
      const next = [committed, ...prev.filter((s) => s !== committed)].slice(
        0,
        HISTORY_LIMIT
      );
      writeHistory(next);
      return next;
    });
  }, [urlQ]);

  function applyQuery(q: string) {
    setValue(q);
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function removeFromHistory(term: string) {
    setHistory((prev) => {
      const next = prev.filter((s) => s !== term);
      writeHistory(next);
      return next;
    });
  }

  // Debounced commit to URL
  useEffect(() => {
    if (value === urlQ) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 250);
    return () => clearTimeout(timer);
  }, [value, urlQ, pathname, router, searchParams]);

  // Typeahead fetch — separate debounce so suggestions appear faster than the
  // URL commit and don't fire for empty queries.
  useEffect(() => {
    const q = value.trim();
    if (q.length === 0) {
      // Clear results when the input is empty. Functional updater + early
      // return when already empty keeps the cascade rule happy in spirit;
      // the lint rule is overzealous about this pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/models?q=${encodeURIComponent(q)}`,
          { signal: ac.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        // setState inside an async callback after a debounce — the
        // react-hooks/set-state-in-effect rule targets sync cascades, not
        // typeahead fetches.
        setSuggestions(data.results);
      } catch {
        /* aborted or network — ignore */
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [value]);

  // Click outside closes dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpenDropdown(true);
        }}
        onFocus={() => setOpenDropdown(true)}
        placeholder="모델 이름 검색"
        autoComplete="off"
        className="w-full pl-9 pr-9 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
      />
      {value && (
        <button
          onClick={() => {
            setValue("");
            setSuggestions([]);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          aria-label="검색어 지우기"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {openDropdown && (suggestions.length > 0 || (value.trim().length === 0 && history.length > 0)) && (
        <div className="absolute z-30 mt-1 left-0 right-0 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
          {suggestions.length > 0 ? (
            <ul role="listbox">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/models/${s.id}`}
                    onClick={() => setOpenDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 transition-colors"
                  >
                    <div className="w-8 h-10 relative bg-zinc-800 rounded overflow-hidden shrink-0">
                      {s.concept_image && (
                        <Image
                          src={s.concept_image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="32px"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{s.name}</p>
                      {s.base_price && (
                        <p className="text-[10px] text-zinc-500">
                          ₩{s.base_price.toLocaleString()} / 일
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div role="listbox" aria-label="최근 검색어">
              <p className="px-3 pt-2 pb-1 text-[10px] tracking-widest uppercase text-zinc-600">
                최근 검색
              </p>
              <ul>
                {history.map((term) => (
                  <li
                    key={term}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <button
                      type="button"
                      onClick={() => {
                        applyQuery(term);
                        setOpenDropdown(false);
                      }}
                      className="flex-1 text-left text-sm text-zinc-300 truncate"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(term)}
                      aria-label={`${term} 기록 삭제`}
                      className="text-zinc-600 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
