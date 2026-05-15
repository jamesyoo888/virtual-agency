"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

interface Props {
  reviewId: string;
}

/**
 * Two-button moderation control for a pending review row. Reject opens a
 * one-line reason input — the reason gets stored on the row for audit even
 * though the policy already hides rejected rows from public selects.
 */
export default function ReviewModerateButtons({ reviewId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(status: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${reviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            rejection_reason: status === "rejected" ? reason || null : null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "처리 실패");
      }
    });
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <input
          autoFocus
          type="text"
          maxLength={500}
          placeholder="거부 사유 (옵션, 500자)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("rejected")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            거부 확정
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white"
          >
            취소
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => submit("approved")}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        승인
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setRejecting(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
      >
        <X className="w-3 h-3" />
        거부
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
