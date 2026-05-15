"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

/**
 * 1-click "Accept" action for inquiry rows in the admin inbox. Transitions
 * status `inquiry → brief_received` without opening the status dropdown.
 * Always rendered next to the dropdown so the slower path stays available
 * when an admin needs to jump straight to `in_progress`.
 */
export default function InquiryAcceptButton({ projectId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept() {
    if (pending || done) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "brief_received" }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setDone(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "전환 실패");
      }
    });
  }

  if (done) {
    return (
      <span className="text-[11px] text-emerald-400 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        승인됨
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-black text-[11px] font-medium hover:bg-zinc-200 disabled:opacity-50"
        title="브리프 접수로 1-click 승격"
      >
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3 h-3" />
        )}
        Accept
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
