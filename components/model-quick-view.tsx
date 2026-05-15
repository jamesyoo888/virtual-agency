"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Eye, ArrowRight } from "lucide-react";
import type { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_LABELS, GENRE_LABELS, MOOD_LABELS } from "@/lib/tags";

const KRW = new Intl.NumberFormat("ko-KR");

interface Props {
  model: Model;
}

/**
 * Floating "quick view" trigger overlaid on a model card. Opens a lightweight
 * modal with the key facts and CTA so users can scan many models without
 * paying the cost of a full navigation per card. SEO-wise the canonical detail
 * page stays the source of truth; this modal carries no indexable content.
 */
export default function ModelQuickView({ model }: Props) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the modal is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 hover:bg-black/90 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        title="빠른 보기"
        aria-label={`${model.name} 빠른 보기`}
      >
        <Eye className="w-3 h-3" />
        퀵뷰
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`qv-title-${model.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-[3/4] relative bg-zinc-900 md:aspect-auto">
              {model.concept_image ? (
                <Image
                  src={model.concept_image}
                  alt={model.name}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(min-width: 768px) 400px, 100vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  No image
                </div>
              )}
              {model.is_exclusive_available && (
                <Badge className="absolute top-3 left-3 bg-white/10 text-white border-white/20 text-[10px]">
                  독점가능
                </Badge>
              )}
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2 id={`qv-title-${model.id}`} className="text-2xl font-bold">
                  {model.name}
                </h2>
                {model.base_price && (
                  <p className="text-sm text-zinc-300 mt-1">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider mr-1">
                      FROM
                    </span>
                    ₩{KRW.format(model.base_price)} / 일
                  </p>
                )}
              </div>

              {model.bio && (
                <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4">
                  {model.bio}
                </p>
              )}

              <TagBlock
                label="산업"
                tags={model.industry_tags}
                labels={INDUSTRY_LABELS}
              />
              <TagBlock
                label="장르"
                tags={model.genre_tags}
                labels={GENRE_LABELS}
              />
              <TagBlock
                label="분위기"
                tags={model.mood_tags}
                labels={MOOD_LABELS}
              />

              <div className="mt-auto pt-3 flex gap-2">
                <Link
                  href={`/models/${model.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-md bg-white text-black hover:bg-zinc-200 text-sm font-medium"
                >
                  상세 보기
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  href={`/models/${model.id}/lookbook`}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-zinc-700 hover:bg-zinc-900 text-xs"
                >
                  Lookbook
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TagBlock({
  label,
  tags,
  labels,
}: {
  label: string;
  tags: string[] | null | undefined;
  labels: Record<string, string>;
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="bg-zinc-800 text-zinc-300 text-[11px]"
          >
            {labels[t] ?? t}
          </Badge>
        ))}
      </div>
    </div>
  );
}
