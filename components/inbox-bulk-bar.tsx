"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Square, CheckSquare, X } from "lucide-react";

interface Props {
  /** All project IDs currently visible in the inbox (used for select-all). */
  projectIds: string[];
}

const STATUS_OPTIONS = [
  { value: "brief_received", label: "브리프 접수" },
  { value: "in_progress", label: "제작 중" },
  { value: "review", label: "검토" },
  { value: "delivered", label: "납품 완료" },
] as const;

/**
 * Inbox multi-select toolbar. Each row in the inbox is rendered with
 * `data-bulk-id="..."`. When bulk mode is on, this component installs a
 * capture-phase document click handler that toggles selection for the
 * targeted row and visually marks it; when off, clicks pass through to
 * the row's normal links/buttons.
 */
export default function InboxBulkBar({ projectIds }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [selectedSize, setSelectedSize] = useState(0);
  const selectedRef = useRef<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function markRow(id: string, selected: boolean) {
    const row = document.querySelector<HTMLElement>(`[data-bulk-id="${id}"]`);
    if (!row) return;
    row.setAttribute("aria-selected", selected ? "true" : "false");
    row.classList.toggle("ring-2", selected);
    row.classList.toggle("ring-white/40", selected);
    row.classList.toggle("relative", selected);
  }

  function clearSelection() {
    for (const id of selectedRef.current) markRow(id, false);
    selectedRef.current = new Set();
    setSelectedSize(0);
  }

  function selectAll() {
    for (const id of projectIds) {
      selectedRef.current.add(id);
      markRow(id, true);
    }
    setSelectedSize(selectedRef.current.size);
  }

  // Document-level capture handler. Active only while bulk mode is on.
  useEffect(() => {
    if (!enabled) return;

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Always let the bulk toolbar itself work normally.
      if (target.closest("[data-bulk-toolbar]")) return;
      const row = target.closest<HTMLElement>("[data-bulk-id]");
      if (!row) return;
      e.preventDefault();
      e.stopPropagation();
      const id = row.dataset.bulkId!;
      const set = selectedRef.current;
      if (set.has(id)) {
        set.delete(id);
        markRow(id, false);
      } else {
        set.add(id);
        markRow(id, true);
      }
      setSelectedSize(set.size);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled]);

  function apply(status: string) {
    if (selectedRef.current.size === 0) return;
    setFeedback(null);
    const ids = [...selectedRef.current];
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/projects/bulk-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { updated: number };
        setFeedback(`${data.updated}건 ${labelFor(status)} 로 전환`);
        clearSelection();
        router.refresh();
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : "전환 실패");
      }
    });
  }

  return (
    <div data-bulk-toolbar className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          if (!next) clearSelection();
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors ${
          enabled
            ? "bg-white text-black border-white"
            : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
        }`}
      >
        {enabled ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        {enabled ? `선택 ${selectedSize}` : "다중 선택"}
      </button>

      {enabled && (
        <>
          <button
            type="button"
            onClick={selectAll}
            disabled={projectIds.length === 0}
            className="px-2 py-1 text-zinc-400 hover:text-white disabled:opacity-40"
          >
            전체 선택
          </button>
          {selectedSize > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-2 py-1 text-zinc-400 hover:text-white"
            >
              <X className="w-3 h-3" /> 비우기
            </button>
          )}
          <span className="text-zinc-700">|</span>
          <select
            disabled={pending || selectedSize === 0}
            onChange={(e) => {
              if (e.target.value) {
                apply(e.target.value);
                e.target.value = "";
              }
            }}
            className="bg-zinc-900 border border-zinc-700 text-xs rounded-md px-2 py-1 text-zinc-200 disabled:opacity-50 focus:outline-none focus:border-zinc-500"
            defaultValue=""
          >
            <option value="" disabled>
              일괄 전환 →
            </option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
          {feedback && <span className="text-[11px] text-zinc-400">{feedback}</span>}
        </>
      )}
    </div>
  );
}

function labelFor(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
