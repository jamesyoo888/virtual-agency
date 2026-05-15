"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";

interface Caps {
  perCall: number | null;
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
}

interface Props {
  initial: Caps;
}

const FIELDS: { key: keyof Caps; label: string; hint: string }[] = [
  { key: "perCall", label: "Per-call", hint: "호출 1건 최대 (USD)" },
  { key: "daily", label: "Daily", hint: "최근 24h 합계 (USD)" },
  { key: "weekly", label: "Weekly", hint: "최근 7d 합계 (USD)" },
  { key: "monthly", label: "Monthly", hint: "최근 30d 합계 (USD)" },
];

function toInput(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

function fromInput(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function CapsEditor({ initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<keyof Caps, string>>({
    perCall: toInput(initial.perCall),
    daily: toInput(initial.daily),
    weekly: toInput(initial.weekly),
    monthly: toInput(initial.monthly),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = FIELDS.some(
    ({ key }) => fromInput(values[key]) !== initial[key]
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload: Partial<Caps> = {};
    for (const { key } of FIELDS) payload[key] = fromInput(values[key]);

    try {
      const res = await fetch("/api/admin/settings/caps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `저장 실패 (${res.status})`);
      }
      setSaved(true);
      // Refresh server component so the cards reflect the new caps.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(preset: Partial<Caps>) {
    setValues((v) => ({
      ...v,
      perCall: preset.perCall !== undefined ? toInput(preset.perCall) : v.perCall,
      daily: preset.daily !== undefined ? toInput(preset.daily) : v.daily,
      weekly: preset.weekly !== undefined ? toInput(preset.weekly) : v.weekly,
      monthly: preset.monthly !== undefined ? toInput(preset.monthly) : v.monthly,
    }));
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            비용 cap 설정
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            비워두면 무제한. env 변수 (
            <code className="text-zinc-400">COST_CAP_*_USD</code>) 가 fallback.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() =>
              applyPreset({ perCall: 2, daily: 10, weekly: 50, monthly: 150 })
            }
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            추천 ($2/$10/$50/$150)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset({ perCall: null, daily: null, weekly: null, monthly: null })
            }
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            모두 해제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {FIELDS.map(({ key, label, hint }) => {
          const inputId = `cap-${key}`;
          return (
            <div key={key} className="space-y-1.5">
              <label
                htmlFor={inputId}
                className="text-[10px] uppercase tracking-wider text-zinc-500"
              >
                {label}
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none"
                >
                  $
                </span>
                <input
                  id={inputId}
                  type="number"
                  min="0"
                  step="0.01"
                  value={values[key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [key]: e.target.value }))
                  }
                  placeholder="무제한"
                  aria-describedby={`${inputId}-hint`}
                  className="w-full pl-6 pr-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 tabular-nums"
                />
              </div>
              <p id={`${inputId}-hint`} className="text-[10px] text-zinc-600">
                {hint}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-xs">
          {error && (
            <span className="inline-flex items-center gap-1.5 text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </span>
          )}
          {saved && !error && (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> 저장됨
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    </section>
  );
}
