"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

export type CatalogView = "grid" | "list";

const STORAGE_KEY = "va_catalog_view";

export function readPersistedView(): CatalogView | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "grid" || v === "list" ? v : null;
  } catch {
    return null;
  }
}

interface Props {
  current: CatalogView;
}

export default function CatalogViewToggle({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore persisted view on first mount if the URL has no explicit ?view=.
  useEffect(() => {
    if (searchParams.get("view")) return;
    const persisted = readPersistedView();
    if (!persisted || persisted === current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", persisted);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // mount-only; do not re-run when searchParams change after navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setView(v: CatalogView) {
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(searchParams.toString());
    if (v === "grid") params.delete("view");
    else params.set("view", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      role="group"
      aria-label="레이아웃 전환"
      className="inline-flex rounded-md border border-zinc-800 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setView("grid")}
        aria-pressed={current === "grid"}
        className={`px-2 py-1.5 transition-colors ${
          current === "grid"
            ? "bg-white text-black"
            : "bg-transparent text-zinc-400 hover:text-white"
        }`}
        title="격자 보기"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setView("list")}
        aria-pressed={current === "list"}
        className={`px-2 py-1.5 transition-colors ${
          current === "list"
            ? "bg-white text-black"
            : "bg-transparent text-zinc-400 hover:text-white"
        }`}
        title="목록 보기"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
