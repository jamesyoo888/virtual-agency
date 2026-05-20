"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  projectId: string;
  initial: number | null;
}

const KRW = new Intl.NumberFormat("ko-KR");

export default function InvoiceAmountEditor({ projectId, initial }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(
    initial != null ? String(initial) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setValue(initial != null ? String(initial) : "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    setError(null);
    const trimmed = value.trim();
    let amount: number | null = null;
    if (trimmed.length > 0) {
      const digits = trimmed.replace(/[,\s]/g, "");
      if (!/^\d+$/.test(digits)) {
        setError("숫자만 입력하세요");
        return;
      }
      amount = parseInt(digits, 10);
      if (!Number.isFinite(amount) || amount < 0) {
        setError("0 이상의 정수");
        return;
      }
    }
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_amount: amount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  if (!editing) {
    return (
      <div className="flex items-baseline gap-2">
        <p className="text-zinc-100 text-sm font-medium">
          {initial != null ? `₩${KRW.format(initial)}` : "미정"}
        </p>
        <button
          type="button"
          onClick={startEdit}
          className="text-zinc-500 hover:text-white inline-flex items-center gap-1 text-[11px]"
          aria-label="견적 편집"
          title="견적 편집"
        >
          <Pencil className="w-3 h-3" />
          편집
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-1">
        <span className="text-sm text-zinc-400 self-center">₩</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          placeholder="0 또는 비워두면 미정"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="px-2 py-1 rounded bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
          aria-label="저장"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          aria-label="취소"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
