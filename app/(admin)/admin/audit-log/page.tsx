import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit Log — Virtual Agency Admin" };

const LIMITS = [50, 100, 200, 500] as const;
const DEFAULT_LIMIT = 100;

interface AuditRow {
  id: string;
  route: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ActorRow {
  id: string;
  email: string | null;
  company: string | null;
}

async function load(limit: number): Promise<{ rows: AuditRow[]; actors: Map<string, ActorRow> }> {
  if (!SUPABASE_CONFIGURED) return { rows: [], actors: new Map() };
  const supabase = await createClient();

  // We piggyback the audit trail on usage_log with route='audit.*' (see
  // /api/admin/settings/{caps,banner}). That avoids a dedicated table for
  // a low-volume feature, but means rows aren't normalized — surface the
  // raw metadata so operators can spot anomalies.
  const { data } = await supabase
    .from("usage_log")
    .select("id, route, user_id, metadata, created_at")
    .like("route", "audit.%")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as AuditRow[];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)));
  const actors = new Map<string, ActorRow>();
  if (userIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, email, company")
      .in("id", userIds);
    for (const c of ((clients ?? []) as ActorRow[])) actors.set(c.id, c);
  }
  return { rows, actors };
}

function relativeLabel(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

function formatDiff(meta: Record<string, unknown> | null): string {
  if (!meta) return "—";
  // Pretty-print but stay compact. Operator can hover for the full JSON in
  // the title attribute if they need it.
  try {
    const compact: Record<string, unknown> = {};
    for (const key of ["patch", "after", "before"]) {
      if (key in meta) compact[key] = meta[key];
    }
    return JSON.stringify(Object.keys(compact).length > 0 ? compact : meta);
  } catch {
    return "[unserializable]";
  }
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const sp = await searchParams;
  const n = Number.parseInt(sp.n ?? "", 10);
  const limit = (LIMITS as readonly number[]).includes(n) ? n : DEFAULT_LIMIT;
  const { rows, actors } = await load(limit);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <ScrollText className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            관리자 설정 변경 이력. usage_log 의 <code>audit.*</code> 라우트 최근 {limit}건.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {LIMITS.map((l) => {
            const active = l === limit;
            const href =
              l === DEFAULT_LIMIT ? "/admin/audit-log" : `/admin/audit-log?n=${l}`;
            return (
              <Link
                key={l}
                href={href}
                className={`px-2 py-0.5 rounded border ${
                  active
                    ? "bg-zinc-100 text-black border-zinc-100"
                    : "text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {l}
              </Link>
            );
          })}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          기록된 audit 이벤트가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">시각</th>
                <th className="text-left px-4 py-3">이벤트</th>
                <th className="text-left px-4 py-3">작업자</th>
                <th className="text-left px-4 py-3">변경 내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((r) => {
                const actor = r.user_id ? actors.get(r.user_id) : null;
                const diff = formatDiff(r.metadata);
                return (
                  <tr key={r.id} className="hover:bg-zinc-900/30 align-top">
                    <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                      {relativeLabel(r.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-300">
                      {r.route.replace(/^audit\./, "")}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">
                      {actor?.email ?? actor?.company ?? r.user_id ?? "—"}
                    </td>
                    <td
                      className="px-4 py-2.5 text-[11px] font-mono text-zinc-500 max-w-md truncate"
                      title={diff}
                    >
                      {diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
