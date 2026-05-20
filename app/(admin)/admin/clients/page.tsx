import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clients — Virtual Agency Admin" };

interface ClientRow {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  role: string | null;
  created_at: string;
  notification_pref: string | null;
}

interface ProjectAgg {
  client_id: string;
  status: string;
  invoice_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface ClientSummary {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  role: string | null;
  campaignCount: number;
  deliveredCount: number;
  totalRevenue: number;
  lastActivityAt: string | null;
  conversionRate: number | null;
}

async function loadSummaries(): Promise<{
  clients: ClientSummary[];
  totalRevenue: number;
}> {
  if (!SUPABASE_CONFIGURED) return { clients: [], totalRevenue: 0 };
  const supabase = await createClient();

  const [{ data: clientsRaw }, { data: projectsRaw }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, email, name, company, role, created_at, notification_pref")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("projects")
      .select("client_id, status, invoice_amount, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000),
  ]);

  const clients = (clientsRaw as ClientRow[]) ?? [];
  const projects = (projectsRaw as ProjectAgg[]) ?? [];

  const byClient = new Map<string, ProjectAgg[]>();
  for (const p of projects) {
    const list = byClient.get(p.client_id) ?? [];
    list.push(p);
    byClient.set(p.client_id, list);
  }

  let totalRevenue = 0;
  const summaries: ClientSummary[] = clients.map((c) => {
    const own = byClient.get(c.id) ?? [];
    const delivered = own.filter((p) => p.status === "delivered");
    const revenue = delivered.reduce(
      (sum, p) => sum + (p.invoice_amount ?? 0),
      0
    );
    totalRevenue += revenue;
    const lastTs = own
      .map((p) => new Date(p.updated_at).getTime())
      .sort((a, b) => b - a)[0];
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      company: c.company,
      role: c.role,
      campaignCount: own.length,
      deliveredCount: delivered.length,
      totalRevenue: revenue,
      lastActivityAt:
        lastTs && Number.isFinite(lastTs) ? new Date(lastTs).toISOString() : null,
      conversionRate:
        own.length > 0 ? delivered.length / own.length : null,
    };
  });

  summaries.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return { clients: summaries, totalRevenue };
}

const KRW = new Intl.NumberFormat("ko-KR");

function relativeLabel(iso: string | null): string {
  if (!iso) return "—";
  const now = Date.now();
  const t = new Date(iso).getTime();
  const days = Math.floor((now - t) / (1000 * 60 * 60 * 24));
  if (days < 1) return "오늘";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

export default async function AdminClientsPage() {
  const { clients, totalRevenue } = await loadSummaries();

  const activeClients = clients.filter((c) => c.campaignCount > 0);
  const repeatClients = clients.filter((c) => c.campaignCount >= 2);
  const payingClients = clients.filter((c) => c.totalRevenue > 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Building2 className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            클라이언트별 LTV · 활동 요약. 우선순위 운영 도구.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- needs real navigation for Content-Disposition download */}
        <a
          href="/api/admin/exports/clients"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">
            {clients.length}
          </p>
          <p className="text-xs text-zinc-500 mt-1">총 등록</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">
            {activeClients.length}
          </p>
          <p className="text-xs text-zinc-500 mt-1">캠페인 1건+</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">
            {repeatClients.length}
          </p>
          <p className="text-xs text-zinc-500 mt-1">재구매 (2건+)</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">
            ₩{KRW.format(totalRevenue)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            누적 매출 ({payingClients.length} 광고주)
          </p>
        </div>
      </section>

      {!SUPABASE_CONFIGURED ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          Supabase 미설정 — production 에서만 동작합니다.
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          아직 등록된 클라이언트가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">광고주</th>
                <th className="text-right px-4 py-3">캠페인</th>
                <th className="text-right px-4 py-3">납품</th>
                <th className="text-right px-4 py-3">전환</th>
                <th className="text-right px-4 py-3">누적</th>
                <th className="text-right px-4 py-3">최근 활동</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-3 min-w-0">
                    <p className="font-medium truncate">
                      {c.company ?? c.name ?? c.email ?? "이름 없음"}
                      {c.role === "admin" && (
                        <span className="ml-2 text-[10px] text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">
                          admin
                        </span>
                      )}
                    </p>
                    {c.email && (
                      <p className="text-xs text-zinc-500 truncate">
                        <a
                          href={`mailto:${c.email}`}
                          className="hover:text-zinc-300"
                        >
                          {c.email}
                        </a>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.campaignCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.deliveredCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.conversionRate != null
                      ? `${Math.round(c.conversionRate * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {c.totalRevenue > 0
                      ? `₩${KRW.format(c.totalRevenue)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {relativeLabel(c.lastActivityAt)}
                    {c.lastActivityAt && c.campaignCount > 0 && (
                      <Link
                        href={`/admin/inbox?q=${encodeURIComponent(
                          c.email ?? c.company ?? ""
                        )}`}
                        className="ml-2 text-zinc-400 hover:text-white"
                      >
                        보기
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
