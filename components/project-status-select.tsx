"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "inquiry", label: "문의" },
  { value: "brief_received", label: "브리프 접수" },
  { value: "in_progress", label: "제작 중" },
  { value: "review", label: "검토" },
  { value: "delivered", label: "납품 완료" },
] as const;

interface Props {
  projectId: string;
  currentStatus: string;
}

export default function ProjectStatusSelect({ projectId, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);

  async function update(next: string) {
    if (next === status || pending) return;
    setError(null);
    const prev = status;
    setStatus(next);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `${res.status}`);
        }
        router.refresh();
      } catch (e) {
        // Roll back the optimistic update.
        setStatus(prev);
        setError(e instanceof Error ? e.message : "변경 실패");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => update(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 text-xs rounded-md px-2 py-1 text-zinc-200 disabled:opacity-50 focus:outline-none focus:border-zinc-500"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
      ) : error ? (
        <span className="text-[10px] text-red-400" title={error}>
          !
        </span>
      ) : (
        <Check className="w-3.5 h-3.5 text-emerald-500/50" />
      )}
    </div>
  );
}
