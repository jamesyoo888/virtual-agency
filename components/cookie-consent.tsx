"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_NAME = "va_cookie_consent";
// Bump this when the privacy notice materially changes so previously-consented
// visitors see the banner again. Format: YYYYMMDD.
const POLICY_VERSION = "20260521";

type Decision = "accept" | "decline";

function readConsent(): Decision | null {
  if (typeof document === "undefined") return null;
  const prefix = `${COOKIE_NAME}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const raw = decodeURIComponent(trimmed.slice(prefix.length));
      const [version, decision] = raw.split(":");
      if (version === POLICY_VERSION && (decision === "accept" || decision === "decline")) {
        return decision;
      }
    }
  }
  return null;
}

function writeConsent(d: Decision): void {
  const oneYear = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    `${POLICY_VERSION}:${d}`
  )}; path=/; max-age=${oneYear}; samesite=lax`;
}

/**
 * KR PIPA-aware cookie consent. Stays out of the way once a decision is
 * stored (cookie includes a policy-version stamp so material changes
 * re-prompt). We don't gate analytics here — that wiring lives in the
 * analytics provider — this only captures and surfaces the visitor's
 * preference so we can layer in the gate later without UI churn.
 */
export default function CookieConsent() {
  const [decision, setDecision] = useState<Decision | "pending">("pending");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecision(readConsent() ?? "pending");
  }, []);

  if (decision !== "pending") return null;

  return (
    <div
      role="dialog"
      aria-label="쿠키 사용 동의"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-50 rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur p-4 text-sm text-zinc-200 shadow-2xl"
    >
      <p className="mb-2 font-medium">쿠키 사용 안내</p>
      <p className="text-xs text-zinc-400 leading-relaxed mb-3">
        본 사이트는 서비스 운영과 사용성 분석을 위해 쿠키를 사용합니다. 자세한
        내용은{" "}
        <Link href="/legal/privacy" className="underline hover:text-white">
          개인정보 처리방침
        </Link>{" "}
        을 확인해 주세요.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            writeConsent("decline");
            setDecision("decline");
          }}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500"
        >
          거부
        </button>
        <button
          type="button"
          onClick={() => {
            writeConsent("accept");
            setDecision("accept");
          }}
          className="text-xs px-3 py-1.5 rounded-md bg-white text-black font-medium hover:bg-zinc-200"
        >
          동의
        </button>
      </div>
    </div>
  );
}
