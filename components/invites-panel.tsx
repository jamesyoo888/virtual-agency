"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { Copy, Trash2, Plus } from "lucide-react";

export interface InviteRow {
  id: string;
  token: string;
  email_hint: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

interface Props {
  initial: InviteRow[];
}

function inviteUrl(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

function status(row: InviteRow): {
  label: string;
  tone: "ok" | "muted" | "warn" | "danger";
} {
  if (row.used_at) return { label: "사용됨", tone: "muted" };
  if (new Date(row.expires_at) < new Date()) return { label: "만료", tone: "danger" };
  return { label: "활성", tone: "ok" };
}

export default function InvitesPanel({ initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<InviteRow[]>(initial);
  const [emailHint, setEmailHint] = useState("");
  const [ttlDays, setTtlDays] = useState("14");
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [rows]
  );

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_hint: emailHint.trim() || null,
          ttl_days: Number(ttlDays) || 14,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const fresh = (await res.json()) as InviteRow;
      setRows((rs) => [{ ...fresh, used_by: null, used_at: null }, ...rs]);
      setEmailHint("");
      toast.success("초대 토큰 발급됨");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "발급 실패");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 토큰을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((rs) => rs.filter((r) => r.id !== id));
      toast.success("삭제됨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("초대 링크 복사됨");
    } catch {
      // Fallback for browsers without clipboard permission.
      prompt("이 링크를 복사하세요", inviteUrl(token));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">새 초대 발급</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2">
          <Input
            value={emailHint}
            onChange={(e) => setEmailHint(e.target.value)}
            placeholder="대상자 이메일 (선택)"
            className="bg-zinc-900 border-zinc-800"
            type="email"
          />
          <Input
            value={ttlDays}
            onChange={(e) => setTtlDays(e.target.value.replace(/\D/g, ""))}
            className="bg-zinc-900 border-zinc-800"
            placeholder="유효 일수"
            type="number"
            min={1}
            max={60}
          />
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-white text-black hover:bg-zinc-200 inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            발급
          </Button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-2">
          이메일은 표시용 메모일 뿐 — 권한 부여는 토큰을 가진 사람이 로그인 후 redeem 할 때 결정됩니다.
        </p>
      </section>

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-500">발급된 초대가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="text-left font-medium py-2">상태</th>
              <th className="text-left font-medium py-2">대상</th>
              <th className="text-left font-medium py-2">만료</th>
              <th className="text-left font-medium py-2">사용 일시</th>
              <th className="text-right font-medium py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const s = status(r);
              const toneClass =
                s.tone === "ok"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : s.tone === "danger"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-zinc-800 text-zinc-400";
              return (
                <tr key={r.id} className="border-b border-zinc-900">
                  <td className="py-2">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] ${toneClass}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className="py-2 text-zinc-300">{r.email_hint ?? "—"}</td>
                  <td className="py-2 text-zinc-400">
                    {new Date(r.expires_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="py-2 text-zinc-500">
                    {r.used_at ? new Date(r.used_at).toLocaleString("ko-KR") : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => copy(r.token)}
                        disabled={!!r.used_at}
                        className="inline-flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        링크
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="inline-flex items-center gap-1 rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
