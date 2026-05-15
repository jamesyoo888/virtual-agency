"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Admin inbox keyword search. Debounced 250ms; pushes the term to the URL so
 * the server-rendered page can apply it. Preserves the active status tab via
 * `?status=...`.
 */
export default function InboxSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [value, setValue] = useState(initialQ);

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `/admin/inbox?${qs}` : "/admin/inbox", { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // intentionally exclude `params` & `router` — they're stable identities
    // and recreating the timer on every URL nudge would cause loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full md:w-72">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="회사·이메일·브리프 검색"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-zinc-600"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          aria-label="검색어 비우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
