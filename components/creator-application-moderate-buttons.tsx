"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
}

export default function CreatorApplicationModerateButtons({ id }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moderate(status: "approved" | "rejected") {
    setPending(status === "approved" ? "approve" : "reject");
    setError(null);
    try {
      const res = await fetch(`/api/admin/creator-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejection_reason: status === "rejected" ? reason : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리 실패");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {showReason && (
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="반려 사유 (선택)"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => moderate("approved")}
          disabled={!!pending}
          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending === "approve" ? "승인 중..." : "승인"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!showReason) setShowReason(true);
            else moderate("rejected");
          }}
          disabled={!!pending}
          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-60"
        >
          {pending === "reject" ? "반려 중..." : showReason ? "반려 확정" : "반려"}
        </button>
        {showReason && (
          <button
            type="button"
            onClick={() => {
              setShowReason(false);
              setReason("");
            }}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white"
          >
            취소
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
