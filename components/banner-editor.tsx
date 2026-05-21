"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";
import type { BannerConfig, BannerTone } from "@/lib/banner";

interface Props {
  initial: BannerConfig | null;
}

const TONES: { value: BannerTone; label: string }[] = [
  { value: "info", label: "기본" },
  { value: "warn", label: "경고" },
  { value: "promo", label: "프로모션" },
];

export default function BannerEditor({ initial }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initial?.text ?? "");
  const [href, setHref] = useState(initial?.href ?? "");
  const [tone, setTone] = useState<BannerTone>(initial?.tone ?? "info");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: { text: string; href: string; tone: BannerTone }) {
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `저장 실패 (${res.status})`);
      }
      setSavedMsg(payload.text ? "저장됨" : "배너 비활성화됨");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          사이트 배너
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          전 사이트 상단에 노출됩니다. 변경 시 방문자의 dismiss 상태가 초기화됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_120px] gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            본문 (max 280자)
          </span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            placeholder="예: 5월 한정 — 첫 캠페인 30% 할인"
            className="w-full px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            CTA URL (선택)
          </span>
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value.slice(0, 500))}
            placeholder="/pricing"
            className="w-full px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            톤
          </span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as BannerTone)}
            className="w-full px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-zinc-600"
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {error && (
            <span className="inline-flex items-center gap-1.5 text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </span>
          )}
          {savedMsg && !error && (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> {savedMsg}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submit({ text: "", href: "", tone })}
            disabled={saving || !initial}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            끄기
          </button>
          <button
            type="button"
            onClick={() => submit({ text, href, tone })}
            disabled={saving || !text.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                저장
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
