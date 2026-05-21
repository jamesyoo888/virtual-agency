"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "va_recently_viewed";

interface ViewedEntry {
  id: string;
  name: string;
  image: string | null;
  ts: number;
}

/**
 * Horizontal scroll strip of recently viewed models, sourced from localStorage
 * written by `<RecentlyViewedTracker />`. Renders nothing if the visitor has
 * no history — first-time users get a clean catalog.
 *
 * Hydration: we wait one effect tick before reading storage so SSR markup
 * (empty) matches the initial client render, avoiding a hydration warning.
 */
export default function RecentlyViewedStrip() {
  const [entries, setEntries] = useState<ViewedEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage is unavailable during SSR, so we hydrate on mount.
    // The two setStates are intentional: `hydrated` gates the render to
    // avoid a hydration mismatch, and `entries` carries the actual data.
    /* eslint-disable react-hooks/set-state-in-effect */
    setHydrated(true);
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setEntries(parsed.filter((e) => e && typeof e.id === "string"));
      }
    } catch {
      // ignore
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!hydrated || entries.length === 0) return null;

  return (
    <section className="mb-6 -mx-5 md:mx-0">
      <div className="flex items-center justify-between px-5 md:px-0 mb-3">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          최근 본 모델
        </h2>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.removeItem(KEY);
            } catch {}
            setEntries([]);
          }}
          className="text-[10px] text-zinc-600 hover:text-zinc-400"
        >
          지우기
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto px-5 md:px-0 pb-2 [scrollbar-width:thin]">
        {entries.map((e) => (
          <Link
            key={e.id}
            href={`/models/${e.id}`}
            className="shrink-0 w-24 group"
          >
            <div className="aspect-[3/4] rounded-md overflow-hidden bg-zinc-900 mb-1.5 relative">
              {e.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- localStorage URL, may be external blob
                <img
                  src={e.image}
                  alt={e.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px]">
                  no image
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-400 group-hover:text-white truncate">
              {e.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
