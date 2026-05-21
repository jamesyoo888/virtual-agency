"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, StickyNote } from "lucide-react";

export interface ProjectNoteRow {
  id: string;
  body: string;
  created_at: string;
  author_email: string | null;
}

interface Props {
  projectId: string;
  notes: ProjectNoteRow[];
}

const MAX = 4000;

export default function ProjectNotes({ projectId, notes }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      setDraft("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove(noteId: string) {
    if (!confirm("이 노트를 삭제할까요?")) return;
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/notes?noteId=${encodeURIComponent(noteId)}`,
        { method: "DELETE" }
      );
      if (res.ok) router.refresh();
    } catch {
      // Silent — page refresh will reveal the state.
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
      <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
        <StickyNote className="w-3.5 h-3.5" />
        내부 노트 ({notes.length})
      </h2>

      <form onSubmit={submit} className="mb-5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          rows={3}
          placeholder="내부 컨텍스트 (광고주에게 노출되지 않습니다)"
          className="w-full rounded-md bg-zinc-900 border border-zinc-800 text-sm p-3 focus:outline-none focus:border-zinc-600"
          disabled={busy}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600 tabular-nums">
            {draft.length} / {MAX}
          </p>
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className="px-3 py-1.5 rounded-md bg-white text-black text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-200"
          >
            {busy ? "추가 중..." : "노트 추가"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400 leading-relaxed">{error}</p>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="text-xs text-zinc-600">
          아직 노트가 없습니다. 내부 컨텍스트(견적 협상 상황, 다음 follow-up 시점 등)를 적어 두면 인계가 쉬워집니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-md bg-zinc-900/40 border border-zinc-800 p-3"
            >
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
                <span className="truncate">
                  {n.author_email ?? "—"} ·{" "}
                  {new Date(n.created_at).toLocaleString("ko-KR", {
                    hour12: false,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="text-zinc-600 hover:text-red-400 shrink-0 ml-2"
                  aria-label="삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
