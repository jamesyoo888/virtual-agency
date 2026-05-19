"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BLUR_DATA_URL } from "@/lib/blur";

interface Props {
  images: { id: string; url: string }[];
}

export default function PortfolioGallery({ images }: Props) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () =>
      setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, close, prev, next]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {images.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setIndex(i)}
            className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900 group focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label={`포트폴리오 이미지 ${i + 1} 크게 보기`}
          >
            <Image
              src={f.url}
              alt=""
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(min-width: 768px) 25vw, 50vw"
              unoptimized
              // First 4 tiles are likely in the initial viewport on desktop;
              // the rest defer until they scroll in. Saves bandwidth on
              // tall portfolios (10+ images) without hurting LCP.
              loading={i < 4 ? "eager" : "lazy"}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 라이트박스"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            autoFocus
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                aria-label="다음 이미지"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[index].url}
              alt=""
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
              priority
            />
          </div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-400 tabular-nums">
            {index + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
