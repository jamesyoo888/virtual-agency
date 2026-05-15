"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitCompareArrows, X, ArrowRight } from "lucide-react";

const KEY = "va_compare_ids_v1";
const MAX = 4;

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((v): v is string => typeof v === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
    window.dispatchEvent(new Event("va-compare-changed"));
  } catch {
    /* storage full */
  }
}

export function useCompareState() {
  // Initialize from localStorage synchronously (lazy init) so we don't need an
  // effect to hydrate — sidesteps the react-hooks/set-state-in-effect rule and
  // avoids a one-frame flash of empty state.
  const [ids, setIds] = useState<string[]>(() => readIds());

  useEffect(() => {
    const onChange = () => setIds(readIds());
    window.addEventListener("va-compare-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("va-compare-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function toggle(id: string) {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((v) => v !== id)
        : prev.length >= MAX
        ? prev
        : [...prev, id];
      writeIds(next);
      return next;
    });
  }

  function clear() {
    setIds([]);
    writeIds([]);
  }

  return { ids, toggle, clear, isFull: ids.length >= MAX };
}

interface DrawerProps {
  models: Array<{ id: string; name: string; concept_image: string | null }>;
}

export default function CompareDrawer({ models }: DrawerProps) {
  const { ids, toggle, clear } = useCompareState();
  if (ids.length === 0) return null;

  const selected = ids
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  const compareHref = `/compare?ids=${ids.join(",")}`;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/95 border border-zinc-700 shadow-2xl backdrop-blur px-4 py-3">
        <GitCompareArrows className="w-4 h-4 text-zinc-400" />
        <span className="text-xs text-zinc-400">컴페어 ({selected.length}/4)</span>
        <div className="flex gap-2">
          {selected.map((m) => (
            <div key={m.id} className="relative group">
              <div className="w-10 h-12 relative rounded overflow-hidden bg-zinc-800">
                {m.concept_image && (
                  <Image
                    src={m.concept_image}
                    alt={m.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => toggle(m.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 hover:bg-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`${m.name} 제거`}
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2"
        >
          비우기
        </button>
        <Link
          href={compareHref}
          className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-black text-xs font-medium hover:bg-zinc-200"
        >
          비교하기
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
