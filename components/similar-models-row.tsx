"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { BLUR_DATA_URL } from "@/lib/blur";

interface SimilarItem {
  id: string;
  name: string;
  concept_image: string | null;
  base_price: number | null;
}

interface Props {
  items: SimilarItem[];
  /**
   * The experiment we're powering. When set, clicks fire a conversion beacon
   * to `/api/experiments/conversion`. Omit (e.g. for non-experiment surfaces)
   * to render with plain links.
   */
  experimentKey?: string;
  /** Free-form surface label for analytics, e.g. "model_detail_similar". */
  surface?: string;
}

/**
 * Client wrapper around the similar-models grid so we can fire a conversion
 * beacon on click. We use `navigator.sendBeacon` rather than `fetch` because:
 *   - the browser may discard pending fetches when navigating away
 *   - the beacon contract guarantees delivery best-effort even on unload
 * If beacon is unavailable (old Safari), we fall back to a fire-and-forget
 * `fetch(..., { keepalive: true })`.
 */
export default function SimilarModelsRow({ items, experimentKey, surface }: Props) {
  const fireConversion = useCallback(() => {
    if (!experimentKey) return;
    const payload = JSON.stringify({ key: experimentKey, surface });
    try {
      const url = "/api/experiments/conversion";
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }
      // Fallback — keepalive lets the request continue after navigation.
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    } catch {
      // Tracking must never block the click — swallow.
    }
  }, [experimentKey, surface]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((sm) => (
        <Link
          key={sm.id}
          href={`/models/${sm.id}`}
          onClick={fireConversion}
          className="group block"
          data-similar-id={sm.id}
        >
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900 mb-2">
            {sm.concept_image && (
              <Image
                src={sm.concept_image}
                alt={sm.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
                loading="lazy"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="(min-width: 768px) 25vw, 50vw"
              />
            )}
          </div>
          <p className="text-sm font-medium group-hover:text-zinc-300">{sm.name}</p>
          {sm.base_price && (
            <p className="text-xs text-zinc-500">
              ₩{sm.base_price.toLocaleString()} / 일
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
