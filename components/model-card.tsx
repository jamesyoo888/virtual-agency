"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ageInYears } from "@/lib/utils";
import { useCompareState } from "@/components/compare-drawer";
import { GitCompareArrows } from "lucide-react";
import ModelQuickView from "@/components/model-quick-view";
import { INDUSTRY_LABELS, GENRE_LABELS } from "@/lib/tags";

// In-memory cache for preview image lookups so revisits don't refetch.
const previewCache = new Map<string, string[]>();

function usePreviewImages(modelId: string, fallback: string | null) {
  const [images, setImages] = useState<string[]>(() => {
    const cached = previewCache.get(modelId);
    if (cached) return cached;
    return fallback ? [fallback] : [];
  });
  const requestedRef = useRef(false);

  function ensureLoaded() {
    if (requestedRef.current) return;
    if (previewCache.has(modelId)) {
      setImages(previewCache.get(modelId)!);
      requestedRef.current = true;
      return;
    }
    requestedRef.current = true;
    fetch(`/api/models/${modelId}/preview-images`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d: { images: string[] }) => {
        if (Array.isArray(d.images) && d.images.length > 0) {
          previewCache.set(modelId, d.images);
          setImages(d.images);
        }
      })
      .catch(() => {
        /* network — keep fallback */
      });
  }

  return { images, ensureLoaded };
}

interface Props {
  model: Model;
  variant: "admin" | "showcase";
  layout?: "card" | "list";
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function ModelCard({ model, variant, layout = "card" }: Props) {
  const href =
    variant === "admin"
      ? `/admin/models/${model.id}`
      : `/models/${model.id}`;

  const ageYears = ageInYears(model.debut_date);
  const compare = useCompareState();
  const isCompared = variant === "showcase" && compare.ids.includes(model.id);

  const enableCarousel = variant === "showcase" && layout === "card";
  const { images, ensureLoaded } = usePreviewImages(
    model.id,
    model.concept_image
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, []);

  function startCycle() {
    if (!enableCarousel) return;
    ensureLoaded();
    // Honor users who've opted into reduced motion — load images so the
    // dots still appear (signaling there's more), but don't auto-cycle.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (cycleRef.current) clearInterval(cycleRef.current);
    cycleRef.current = setInterval(() => {
      setActiveIdx((i) => i + 1);
    }, 1100);
  }
  function stopCycle() {
    if (cycleRef.current) {
      clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    setActiveIdx(0);
  }

  const heroImages =
    images.length > 0
      ? images
      : model.concept_image
        ? [model.concept_image]
        : [];
  const showCarousel = enableCarousel && heroImages.length > 1;
  const currentIdx = showCarousel ? activeIdx % heroImages.length : 0;
  const currentImage = heroImages[currentIdx] ?? null;

  if (layout === "list" && variant === "showcase") {
    return (
      <article className="group flex items-stretch gap-4 p-3 rounded-lg border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-950/50 transition-colors">
        <Link
          href={href}
          className="shrink-0 w-24 sm:w-32 aspect-[3/4] relative rounded-md overflow-hidden bg-zinc-900"
        >
          {model.concept_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.concept_image}
              alt={model.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
              No image
            </div>
          )}
          {model.is_exclusive_available && (
            <Badge className="absolute top-1.5 left-1.5 bg-white/10 text-white border-white/20 text-[10px] px-1.5 py-0">
              독점
            </Badge>
          )}
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          <Link href={href} className="block">
            <h3 className="font-semibold text-base group-hover:text-zinc-200 transition-colors">
              {model.name}
            </h3>
          </Link>
          {ageYears !== null && (
            <p className="text-xs text-zinc-500 mt-0.5">생체나이 {ageYears}세</p>
          )}
          {model.bio && (
            <p className="text-sm text-zinc-400 line-clamp-2 mt-1.5">{model.bio}</p>
          )}
          {(model.industry_tags?.length ?? 0) + (model.genre_tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {model.industry_tags?.slice(0, 2).map((t) => (
                <Badge
                  key={`i-${t}`}
                  variant="secondary"
                  className="bg-zinc-900 text-zinc-400 text-[10px] px-1.5 py-0"
                >
                  {INDUSTRY_LABELS[t] ?? t}
                </Badge>
              ))}
              {model.genre_tags?.slice(0, 2).map((t) => (
                <Badge
                  key={`g-${t}`}
                  variant="secondary"
                  className="bg-zinc-900 text-zinc-400 text-[10px] px-1.5 py-0"
                >
                  {GENRE_LABELS[t] ?? t}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between">
            {model.base_price ? (
              <p className="text-sm text-zinc-200">
                ₩{model.base_price.toLocaleString()}{" "}
                <span className="text-xs text-zinc-500">/ 일</span>
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                compare.toggle(model.id);
              }}
              disabled={!isCompared && compare.isFull}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors ${
                isCompared
                  ? "bg-white text-black border-white"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              title={isCompared ? "컴페어에서 제거" : "컴페어에 추가"}
              aria-pressed={isCompared}
            >
              <GitCompareArrows className="w-3 h-3" />
              {isCompared ? "선택됨" : "비교"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div
      className="group block relative"
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
      onFocus={startCycle}
      onBlur={stopCycle}
    >
      <Link href={href}>
        <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900 mb-3">
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImage}
              alt={model.name}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
              No image
            </div>
          )}

          {showCarousel && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {heroImages.map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentIdx ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}

          {variant === "admin" && (
            <div className="absolute top-2 right-2">
              <Badge className={STATUS_COLORS[model.status]}>
                {model.status}
              </Badge>
            </div>
          )}

          {variant === "showcase" && model.is_exclusive_available && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-white/10 text-white border-white/20 text-xs">
                독점가능
              </Badge>
            </div>
          )}
        </div>
      </Link>

      {variant === "showcase" && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              compare.toggle(model.id);
            }}
            disabled={!isCompared && compare.isFull}
            className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
              isCompared
                ? "bg-white text-black opacity-100"
                : "bg-black/70 text-white hover:bg-black/90"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title={isCompared ? "컴페어에서 제거" : "컴페어에 추가"}
            aria-pressed={isCompared}
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
          </button>
          <ModelQuickView model={model} />
        </>
      )}

      <Link href={href} className="block">
        <p className="font-medium text-sm group-hover:text-zinc-300 transition-colors">
          {model.name}
        </p>
        {ageYears !== null && (
          <p className="text-xs text-zinc-500 mt-0.5">생체나이 {ageYears}세</p>
        )}
        {variant === "showcase" && model.base_price && (
          <p className="text-xs text-zinc-400 mt-0.5">
            ₩{model.base_price.toLocaleString()} / 일
          </p>
        )}
        {variant === "admin" && (
          <p className="text-xs text-zinc-500 mt-0.5">
            팔로워 {(model.follower_count ?? 0).toLocaleString()}
          </p>
        )}
      </Link>
    </div>
  );
}
