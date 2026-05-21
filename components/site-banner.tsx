"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Inlined to avoid pulling lib/banner.ts (which imports next/headers via the
// supabase server client) into the client bundle. The type is structural so
// we duplicate it here rather than importing.
const BANNER_DISMISS_COOKIE = "va_banner_dismissed";

export interface BannerConfig {
  text: string;
  href?: string;
  tone?: "info" | "warn" | "promo";
  updated_at: string;
}

const TONE_CLASS: Record<NonNullable<BannerConfig["tone"]>, string> = {
  info: "bg-zinc-900 text-zinc-200 border-b-zinc-800",
  warn: "bg-amber-950/40 text-amber-100 border-b-amber-900/60",
  promo: "bg-emerald-950/30 text-emerald-100 border-b-emerald-900/50",
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

function writeCookie(name: string, value: string, days = 60): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

interface Props {
  banner: BannerConfig;
}

export default function SiteBanner({ banner }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Cookie reads aren't available during SSR; deferring to a mount effect
    // is the standard pattern for "dismissible on the client only" UI. The
    // initial render intentionally hides the banner so we never flash it to
    // a visitor who has already dismissed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readCookie(BANNER_DISMISS_COOKIE) !== banner.updated_at);
  }, [banner.updated_at]);

  if (!visible) return null;

  const tone = banner.tone ?? "info";
  const classes = TONE_CLASS[tone];

  return (
    <div className={`border-b ${classes} text-sm`}>
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="flex-1 truncate">
          {banner.href ? (
            <Link href={banner.href} className="underline-offset-4 hover:underline">
              {banner.text}
            </Link>
          ) : (
            banner.text
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            writeCookie(BANNER_DISMISS_COOKIE, banner.updated_at);
            setVisible(false);
          }}
          className="text-xs opacity-70 hover:opacity-100"
          aria-label="배너 닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
