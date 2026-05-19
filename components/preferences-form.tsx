"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import type { ClientPreferences } from "@/lib/preferences";

const FIELDS: {
  key: keyof ClientPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "email_inquiry_receipt",
    label: "문의 접수 이메일",
    description: "문의를 보낼 때 접수 확인 메일을 받습니다.",
  },
  {
    key: "email_status_changes",
    label: "프로젝트 상태 변경 이메일",
    description: "프로젝트 단계가 바뀌면 이메일로 알림을 받습니다.",
  },
  {
    key: "email_quote_ready",
    label: "견적서 준비 이메일",
    description: "견적서가 준비되면 메일로 안내합니다.",
  },
  {
    key: "email_weekly_digest",
    label: "주간 요약 이메일",
    description: "매주 월요일 진행 중 프로젝트의 변화를 한 통으로 모아 보냅니다.",
  },
  {
    key: "toast_status_changes",
    label: "화면 토스트 알림",
    description: "대시보드를 열어둔 상태에서 상태 변경 시 토스트를 표시합니다.",
  },
];

interface Props {
  initial: ClientPreferences;
  disabled?: boolean;
}

export default function PreferencesForm({ initial, disabled }: Props) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<ClientPreferences>(initial);
  const [saving, setSaving] = useState<keyof ClientPreferences | null>(null);

  async function toggle(key: keyof ClientPreferences) {
    if (disabled) return;
    const next = !prefs[key];
    // Optimistic — flip first so the UI feels immediate. Roll back on error.
    setPrefs((p) => ({ ...p, [key]: next }));
    setSaving(key);
    try {
      const res = await fetch("/api/client/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const fresh = (await res.json()) as ClientPreferences;
      setPrefs(fresh);
    } catch (err) {
      setPrefs((p) => ({ ...p, [key]: !next }));
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(null);
    }
  }

  return (
    <ul className="space-y-3">
      {FIELDS.map((f) => {
        const checked = prefs[f.key];
        const busy = saving === f.key;
        return (
          <li
            key={f.key}
            className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-zinc-100">{f.label}</p>
              <p className="text-xs text-zinc-400 mt-1">{f.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              aria-label={f.label}
              disabled={disabled || busy}
              onClick={() => toggle(f.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                checked ? "bg-emerald-500" : "bg-zinc-700"
              } ${busy ? "opacity-60" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                  checked ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
