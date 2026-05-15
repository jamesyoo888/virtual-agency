"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
}

function buildPages(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

export default function CatalogPagination({ page, totalPages }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(p: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const items = buildPages(page, totalPages);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label="페이지네이션"
      className="mt-10 flex items-center justify-center gap-1 text-sm"
    >
      {prevDisabled ? (
        <span
          aria-disabled="true"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-zinc-700 cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" /> 이전
        </span>
      ) : (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-900"
        >
          <ChevronLeft className="w-4 h-4" /> 이전
        </Link>
      )}

      {items.map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-zinc-600">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className="min-w-8 inline-flex items-center justify-center px-3 py-2 rounded-md bg-white text-black font-semibold"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            className="min-w-8 inline-flex items-center justify-center px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-900"
          >
            {item}
          </Link>
        )
      )}

      {nextDisabled ? (
        <span
          aria-disabled="true"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-zinc-700 cursor-not-allowed"
        >
          다음 <ChevronRight className="w-4 h-4" />
        </span>
      ) : (
        <Link
          href={hrefFor(page + 1)}
          rel="next"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-900"
        >
          다음 <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </nav>
  );
}
