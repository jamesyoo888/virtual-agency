import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { summarizeUsage } from "@/lib/cost/store";
import { loadFunnel, loadFunnelBySource, stageConversionRate } from "@/lib/analytics/funnel";
import { loadSearchAnalytics } from "@/lib/analytics/search-log";
import { loadResponseSla } from "@/lib/analytics/response-sla";
import {
  Users,
  Inbox,
  Receipt,
  PlayCircle,
  TrendingUp,
  ArrowRight,
  Filter,
  Search,
  Mail,
  Star,
  AlertTriangle,
  Timer,
} from "lucide-react";

const STAGE_LABELS_KO: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프",
  in_progress: "제작",
  review: "검토",
  delivered: "납품",
};

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Virtual Agency" };

interface KPIs {
  newInquiries24h: number;
  activeProjects: number;
  totalModels: number;
  activeModels: number;
}

interface OpsSnapshot {
  newsletter7d: number;
  newsletter30d: number;
  pendingReviews: number;
}

async function loadOpsSnapshot(): Promise<OpsSnapshot> {
  if (!SUPABASE_CONFIGURED) {
    return { newsletter7d: 0, newsletter30d: 0, pendingReviews: 0 };
  }
  const supabase = await createClient();
  const sevenAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const thirtyAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ count: n7 }, { count: n30 }, { count: pending }] = await Promise.all([
    supabase
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenAgo),
    supabase
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyAgo),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    newsletter7d: n7 ?? 0,
    newsletter30d: n30 ?? 0,
    pendingReviews: pending ?? 0,
  };
}

interface RecentInquiry {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_company: string | null;
  model_name: string | null;
}

async function loadRecentInquiries(): Promise<RecentInquiry[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, status, created_at, client:clients(company), model:models(name)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  type Row = {
    id: string;
    title: string;
    status: string;
    created_at: string;
    client: { company: string | null } | null;
    model: { name: string | null } | null;
  };
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    created_at: r.created_at,
    client_company: r.client?.company ?? null,
    model_name: r.model?.name ?? null,
  }));
}

async function loadKPIs(): Promise<KPIs> {
  if (!SUPABASE_CONFIGURED) {
    const list = devModelStore.list();
    return {
      newInquiries24h: 0,
      activeProjects: 0,
      totalModels: list.length,
      activeModels: list.filter((m) => m.status === "active").length,
    };
  }
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: newInquiries24h },
    { count: activeProjects },
    { count: totalModels },
    { count: activeModels },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "inquiry")
      .gte("created_at", since),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .in("status", ["brief_received", "in_progress", "review"]),
    supabase.from("models").select("id", { count: "exact", head: true }),
    supabase
      .from("models")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    newInquiries24h: newInquiries24h ?? 0,
    activeProjects: activeProjects ?? 0,
    totalModels: totalModels ?? 0,
    activeModels: activeModels ?? 0,
  };
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  inquiry: "bg-yellow-500/20 text-yellow-400",
  brief_received: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  review: "bg-orange-500/20 text-orange-400",
  delivered: "bg-green-500/20 text-green-400",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품",
};

export default async function AdminHomePage() {
  const [kpis, usage, recent, funnel, bySource, search7d, ops, sla] = await Promise.all([
    loadKPIs(),
    summarizeUsage(),
    loadRecentInquiries(),
    loadFunnel(30),
    loadFunnelBySource(30, 6),
    loadSearchAnalytics({ windowDays: 7, limit: 5 }),
    loadOpsSnapshot(),
    loadResponseSla(30),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-zinc-500 mt-1">
          오늘의 핵심 지표와 빠른 이동.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          icon={Inbox}
          label="신규 문의 (24h)"
          value={kpis.newInquiries24h.toLocaleString()}
          href="/admin/inbox?status=inquiry"
          accent={kpis.newInquiries24h > 0 ? "bg-yellow-500/15 text-yellow-300" : ""}
        />
        <KPI
          icon={PlayCircle}
          label="진행 중 프로젝트"
          value={kpis.activeProjects.toLocaleString()}
          href="/admin/inbox?status=in_progress"
        />
        <KPI
          icon={Users}
          label="활성 모델"
          value={`${kpis.activeModels} / ${kpis.totalModels}`}
          href="/admin/models"
        />
        <KPI
          icon={Receipt}
          label="오늘 비용"
          value={`$${usage.daily.toFixed(2)}`}
          href="/admin/usage"
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <ShortcutCard
          title="새 모델 생성"
          desc="5단계 위저드 — 페르소나 → 컨셉 → 다각도 → 3D → 최종"
          href="/admin/models/new"
        />
        <ShortcutCard
          title="Image Studio"
          desc="단발 이미지 생성 (Easy Diffusion → FLUX → Pollinations 폴백)"
          href="/admin/image-studio"
        />
        <ShortcutCard
          title="Video Studio"
          desc="image-to-video (Kling/Minimax) + 립싱크"
          href="/admin/video-studio"
        />
      </section>

      {recent.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              최근 문의·프로젝트
            </h2>
            <Link
              href="/admin/inbox"
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
            >
              전체 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-zinc-800/70">
            {recent.map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3 text-sm">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                    STATUS_BADGE_COLORS[r.status] ?? "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-zinc-200">{r.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {r.client_company ?? "—"} ·{" "}
                    {r.model_name ?? "모델 미선택"}
                  </p>
                </div>
                <p className="text-xs text-zinc-500 tabular-nums shrink-0">
                  {new Date(r.created_at).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {funnel.total > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              30일 컨버전 funnel
            </h2>
            <span className="text-xs text-zinc-600 ml-auto tabular-nums">
              {funnel.total.toLocaleString()} inquiries
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {funnel.stages.map((s, i) => {
              const next = funnel.stages[i + 1];
              const rate = next ? stageConversionRate(s, next) : null;
              const widthPct = funnel.total > 0 ? Math.round((s.reached / funnel.total) * 100) : 0;
              return (
                <div key={s.stage}>
                  <p className="text-xs text-zinc-500 mb-1">
                    {STAGE_LABELS_KO[s.stage] ?? s.stage}
                  </p>
                  <p className="text-lg font-bold tabular-nums">
                    {s.reached.toLocaleString()}
                  </p>
                  <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {rate !== null && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                      → {(rate * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            누적 (각 단계 도달 ≧). 화살표는 다음 단계 진행률.
          </p>

          {bySource.length > 0 && (
            <div className="mt-5 pt-5 border-t border-zinc-800">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                출처별 (30d, 상위 {bySource.length})
              </p>
              <ul className="space-y-1.5">
                {bySource.map((s) => (
                  <li key={s.source} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 truncate">{s.source}</span>
                    <span className="text-zinc-500 tabular-nums whitespace-nowrap">
                      {s.total.toLocaleString()} → {s.delivered.toLocaleString()}
                      <span className={`ml-2 ${s.conversionRate >= 0.3 ? "text-emerald-400" : s.conversionRate > 0 ? "text-zinc-400" : "text-zinc-600"}`}>
                        {(s.conversionRate * 100).toFixed(0)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              인기 검색어 (7일)
            </h2>
            <Link
              href="/admin/search-analytics"
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 ml-auto"
            >
              상세 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {search7d.top.length === 0 ? (
            <p className="text-xs text-zinc-500">아직 검색어가 수집되지 않았습니다.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {search7d.top.map((s) => (
                <li key={s.q} className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200 truncate">{s.q}</span>
                  <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                    {s.count}회 · 결과 {s.avgResults}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {search7d.zero.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                0결과 (콘텐츠 갭)
              </p>
              <ul className="text-xs text-zinc-400 space-y-1">
                {search7d.zero.slice(0, 3).map((s) => (
                  <li key={s.q} className="flex items-center justify-between">
                    <span className="truncate">{s.q}</span>
                    <span className="text-zinc-500 tabular-nums shrink-0 ml-2">
                      {s.zeroResultCount}회
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              운영 스냅샷
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">뉴스레터 (7일)</p>
              <p className="text-xl font-bold tabular-nums mt-0.5">
                {ops.newsletter7d.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                30일: {ops.newsletter30d.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Star className="w-3 h-3" /> 대기 리뷰
              </p>
              <p
                className={`text-xl font-bold tabular-nums mt-0.5 ${
                  ops.pendingReviews > 0 ? "text-yellow-300" : "text-zinc-200"
                }`}
              >
                {ops.pendingReviews.toLocaleString()}
              </p>
              <Link
                href="/admin/reviews?status=pending"
                className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-0.5 inline-block"
              >
                모더레이션 →
              </Link>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-zinc-800">
            <Link
              href="/admin/newsletter"
              className="text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1"
            >
              뉴스레터 명단 <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/admin/audit-log"
              className="text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1 ml-3"
            >
              Audit Log <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {sla.totalInquiries > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              인콰이어 응답 SLA (30일)
            </h2>
            <span className="text-xs text-zinc-600 ml-auto tabular-nums">
              응답 {sla.respondedCount} / 총 {sla.totalInquiries}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <SlaStat
              label="중앙값"
              value={sla.medianHours != null ? fmtHours(sla.medianHours) : "—"}
            />
            <SlaStat
              label="p90"
              value={sla.p90Hours != null ? fmtHours(sla.p90Hours) : "—"}
            />
            <SlaStat
              label="열린 inquiry"
              value={sla.openCount.toLocaleString()}
            />
            <SlaStat
              label="24h+ 지연"
              value={sla.staleOpenCount.toLocaleString()}
              accent={sla.staleOpenCount > 0 ? "text-red-300" : ""}
            />
          </div>
          {sla.staleOpenCount > 0 && (
            <Link
              href="/admin/inbox?status=inquiry"
              className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
            >
              지연 인콰이어 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            비용 추세
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="24h" value={`$${usage.daily.toFixed(2)}`} />
          <Stat label="7d" value={`$${usage.weekly.toFixed(2)}`} />
          <Stat label="30d" value={`$${usage.monthly.toFixed(2)}`} />
        </div>
        <Link
          href="/admin/usage"
          className="inline-block mt-4 text-xs text-zinc-400 hover:text-white"
        >
          상세 + cap 편집 →
        </Link>
      </section>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  href,
  accent = "",
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className="w-4 h-4 text-zinc-500" />
      </div>
      <p
        className={`mt-3 text-2xl font-bold tabular-nums inline-block px-1.5 -mx-1.5 rounded ${accent}`}
      >
        {value}
      </p>
    </Link>
  );
}

function ShortcutCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900 transition-colors"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function SlaStat({
  label,
  value,
  accent = "",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-0.5 ${accent}`}>{value}</p>
    </div>
  );
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}분`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}일`;
}
