"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

export default function AgentDecisionButtons({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "approved" | "rejected") {
    setError(null);
    const res = await fetch(`/api/admin/agents/${agentId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: string }).error ?? `Update failed (${res.status})`
      );
      return;
    }
    // refresh server component on success
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => submit("approved")}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 hover:bg-emerald-500/25 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Approve
      </button>
      <button
        type="button"
        onClick={() => submit("rejected")}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs rounded-md bg-red-500/15 text-red-300 border border-red-500/30 px-3 py-1.5 hover:bg-red-500/25 disabled:opacity-60"
      >
        <X className="w-3.5 h-3.5" />
        Reject
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
}
