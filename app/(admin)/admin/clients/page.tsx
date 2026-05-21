import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Building2, AlertTriangle } from "lucide-react";

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
  /** Revenue from delivered projects updated within the last 90 days. */
  revenue90d: number;
  lastActivityAt: string | null;
  conversionRate: number | null;
}

async function loadSummaries(): Promise<{
  clients: ClientSummary[];
  totalRevenue: number;
  totalRevenue90d: number;
  /** Set of client_ids with no activity in 90+ days (and at least 1 campaign). */
  neglectedIds: Set<string>;
}> {
  if (!SUPABASE_CONFIGURED)
    return {
      clients: [],
      totalRevenue: 0,
      totalRevenue90d: 0,
      neglectedIds: new Set(),
    };
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
  let totalRevenue90d = 0;
  const ninetyAgo = Date.now() - 90 * 86_400_000;
  const summaries: ClientSummary[] = clients.map((c) => {
    const own = byClient.get(c.id) ?? [];
    const delivered = own.filter((p) => p.status === "delivered");
    const revenue = delivered.reduce(
      (sum, p) => sum + (p.invoice_amount ?? 0),
      0
    );
    const revenue90d = delivered.reduce((sum, p) => {
      const t = new Date(p.updated_at).getTime();
      if (Number.isFinite(t) && t >= ninetyAgo) return sum + (p.invoice_amount ?? 0);
      return sum;
    }, 0);
    totalRevenue += revenue;
    totalRevenue90d += revenue90d;
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
      revenue90d,
      lastActivityAt:
        lastTs && Number.isFinite(lastTs) ? new Date(lastTs).toISOString() : null,
      conversionRate:
        own.length > 0 ? delivered.length / own.length : null,
    };
  });

  summaries.sort((a, b) => b.totalRevenue - a.totalRevenue);
  // Neglected = at least 1 campaign + last activity older than 90 days (or
  // no recorded activity at all). Computed inside the loader so the page
  // component stays pure.
  const neglectedIds = new Set(
    summaries
      .filter((c) => {
        if (c.campaignCount === 0) return false;
        if (!c.lastActivityAt) return true;
        return new Date(c.lastActivityAt).getTime() < ninetyAgo;
      })
      .map((c) => c.id)
  );
  return {
    clients: summaries,
    totalRevenue,
    totalRevenue90d,
    neglectedIds,
  };
}

const KRW = new Intl.NumberFormat("ko-KR");

function ConcentrationCard({
  clients,
  totalRevenue,
  totalRevenue90d,
}: {
  clients: ClientSummary[];
  totalRevenue: number;
  totalRevenue90d: number;
}) {
  // Concentration risk — share of revenue earned by the top-5 paying clients.
  // > 60% is a yellow flag for a single-vendor agency, > 80% is red.
  const paying = clients
    .filter((c) => c.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
  if (paying.length === 0 || totalRevenue === 0) return null;
  const top5 = paying.slice(0, 5);
  const top5Sum = top5.reduce((s, c) => s + c.totalRevenue, 0);
  const top5Share = top5Sum / totalRevenue;
  // Same calculation but only on the trailing 90-day window. Lifetime
  // concentration can mask a recent diversification (or vice versa). When
  // the two values diverge sharply, the operator should investigate the
  // delta rather than just the lifetime number.
  const paying90 = clients
    .filter((c) => c.revenue90d > 0)
    .sort((a, b) => b.revenue90d - a.revenue90d);
  const top5_90 = paying90.slice(0, 5);
  const top5_90Sum = top5_90.reduce((s, c) => s + c.revenue90d, 0);
  const top5_90Share = totalRevenue90d > 0 ? top5_90Sum / totalRevenue90d : 0;
  // Repeat-customer revenue share — what % of total revenue comes from
  // clients with 2+ campaigns. Healthy agencies trend > 50%.
  const repeatRevenue = clients
    .filter((c) => c.campaignCount >= 2)
    .reduce((s, c) => s + c.totalRevenue, 0);
  const repeatShare = repeatRevenue / totalRevenue;
  const tone =
    top5Share > 0.8
      ? "text-red-400"
      : top5Share > 0.6
      ? "text-amber-400"
      : "text-emerald-400";
  const tone90 =
    top5_90Share > 0.8
      ? "text-red-400"
      : top5_90Share > 0.6
      ? "text-amber-400"
      : "text-emerald-400";
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
      <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
        {top5Share > 0.6 && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        )}
        매출 집중도 분석
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Top-5 비중 (Lifetime)
          </p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${tone}`}>
            {(top5Share * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            ₩{KRW.format(top5Sum)} / 총 ₩{KRW.format(totalRevenue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Top-5 비중 (90d)
          </p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${tone90}`}>
            {totalRevenue90d > 0
              ? `${(top5_90Share * 100).toFixed(0)}%`
              : "—"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            ₩{KRW.format(top5_90Sum)} / ₩{KRW.format(totalRevenue90d)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            재구매 광고주 매출
          </p>
          <p
            className={`text-2xl font-bold tabular-nums mt-1 ${
              repeatShare >= 0.5 ? "text-emerald-400" : "text-zinc-300"
            }`}
          >
            {(repeatShare * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            ₩{KRW.format(repeatRevenue)} (2+ 캠페인)
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            Top-5 분포
          </p>
          <ul className="space-y-1">
            {top5.map((c) => {
              const share = c.totalRevenue / totalRevenue;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-zinc-300 truncate mr-2">
                    {c.company ?? c.name ?? c.email ?? "—"}
                  </span>
                  <span className="text-zinc-500 tabular-nums shrink-0">
                    {(share * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-zinc-600 leading-relaxed">
        Top-5 비중이 60% 초과면 단일 광고주 의존 리스크. 재구매 매출이 50% 미만이면 신규 유입 채널의 LTV 가 부족한 신호. Lifetime 과 90d 비중이 크게 다르면(±15pp 이상) 최근 분기에 구조 변화가 있다는 신호로, 신규 광고주 유입 또는 핵심 광고주 이탈을 확인하세요.
      </p>
    </section>
  );
}

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

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const showNeglected = filter === "neglected";
  const { clients: allClients, totalRevenue, totalRevenue90d, neglectedIds } =
    await loadSummaries();
  const clients = showNeglected
    ? allClients.filter((c) => neglectedIds.has(c.id))
    : allClients;
  const neglectedCount = neglectedIds.size;

  const activeClients = allClients.filter((c) => c.campaignCount > 0);
  const repeatClients = allClients.filter((c) => c.campaignCount >= 2);
  const payingClients = allClients.filter((c) => c.totalRevenue > 0);

  // Compute top-5 paying clients up front so the table can badge them inline
  // without re-sorting per row. Used purely for badge rendering. We compute
  // off the full `allClients` set so the badge meaning doesn't change when
  // the user filters to "neglected".
  const top5Ids = new Set(
    [...allClients]
      .filter((c) => c.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((c) => c.id)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center gap-3">
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

      <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs">
        <Link
          href="/admin/clients"
          className={`px-3 py-1.5 rounded-md border transition-colors ${
            !showNeglected
              ? "bg-white text-black border-white"
              : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
          }`}
        >
          전체
          <span className="ml-1.5 opacity-60 tabular-nums">{allClients.length}</span>
        </Link>
        <Link
          href="/admin/clients?filter=neglected"
          className={`px-3 py-1.5 rounded-md border transition-colors inline-flex items-center gap-1 ${
            showNeglected
              ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
              : "bg-transparent text-amber-400 border-amber-500/30 hover:border-amber-400 hover:text-amber-200"
          }`}
          title="90일 이상 활동 없는 캠페인 1건+ 광고주 — 리액티베이션 대상"
        >
          90일+ Neglected
          {neglectedCount > 0 && (
            <span className="opacity-90 tabular-nums">{neglectedCount}</span>
          )}
        </Link>
      </nav>

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

      <ConcentrationCard
        clients={clients}
        totalRevenue={totalRevenue}
        totalRevenue90d={totalRevenue90d}
      />


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
                      {top5Ids.has(c.id) && (
                        <span className="ml-1.5 text-[10px] text-yellow-300 border border-yellow-500/40 rounded px-1.5 py-0.5 bg-yellow-500/10">
                          Top-5
                        </span>
                      )}
                      {!top5Ids.has(c.id) && c.campaignCount >= 2 && (
                        <span className="ml-1.5 text-[10px] text-zinc-300 border border-zinc-500/40 rounded px-1.5 py-0.5 bg-zinc-500/10">
                          Repeat
                        </span>
                      )}
                      {c.campaignCount === 1 && (
                        <span className="ml-1.5 text-[10px] text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5">
                          신규
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
