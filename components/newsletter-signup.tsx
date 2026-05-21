"use client";

import { useState } from "react";

/**
 * Lightweight footer signup form. Posts to /api/newsletter and shows a
 * one-line confirmation. No state management beyond local — repeat submits
 * are idempotent on the server.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage(null);
    try {
      const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
      const payload: Record<string, string> = {
        email: email.trim(),
        source: "footer",
      };
      if (url) {
        const s = url.searchParams.get("utm_source");
        const m = url.searchParams.get("utm_medium");
        const c = url.searchParams.get("utm_campaign");
        if (s) payload.utm_source = s;
        if (m) payload.utm_medium = m;
        if (c) payload.utm_campaign = c;
      }
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("err");
        setMessage(body.error ?? "구독 실패");
        return;
      }
      setStatus("ok");
      setMessage(
        body.alreadySubscribed ? "이미 구독 중입니다." : "구독 완료. 감사합니다."
      );
      setEmail("");
    } catch {
      setStatus("err");
      setMessage("네트워크 오류");
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-1.5">
      <label className="block text-zinc-400 text-[11px]">
        뉴스레터 — 사례·가이드 월 1회
      </label>
      <div className="flex gap-1.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@brand.com"
          className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 px-2.5 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "..." : "구독"}
        </button>
      </div>
      {message && (
        <p
          className={`text-[10px] ${
            status === "ok" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
