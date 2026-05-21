"use client";

import { useEffect } from "react";

const KEY = "va_recently_viewed";
const MAX = 8;

interface ViewedEntry {
  id: string;
  name: string;
  image: string | null;
  ts: number;
}

interface Props {
  id: string;
  name: string;
  image: string | null;
}

/**
 * Fire-and-forget local history writer. Mounts on `/models/[id]`, pushes the
 * model to the top of localStorage. Reader lives in `recently-viewed-strip`.
 *
 * Kept intentionally tiny — no UI, no SSR weight — so it can sit at the
 * bottom of the page tree without affecting Largest Contentful Paint.
 */
export default function RecentlyViewedTracker({ id, name, image }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      const list: ViewedEntry[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((e) => e.id !== id);
      const next: ViewedEntry[] = [
        { id, name, image, ts: Date.now() },
        ...filtered,
      ].slice(0, MAX);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // localStorage may be disabled (private mode, quota); silently ignore.
    }
  }, [id, name, image]);

  return null;
}
