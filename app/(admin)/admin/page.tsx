import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { summarizeUsage } from "@/lib/cost/store";
import { loadFunnel, loadFunnelBySource, stageConversionRate } from "@/lib/analytics/funnel";
import { loadSearchAnalytics } from "@/lib/analytics/search-log";
import { loadResponseSla } from "@/lib/analytics/response-sla";
import { wowFromRows, type WowMetric } from "@/lib/analytics/week-over-week";
import { computeMtdRevenue, type MtdRevenue } from "@/lib/analytics/mtd-revenue";
import {
  aggregateTopClients,
  type DeliveredProjectRow,
  type TopClientAggregate,
} from "@/lib/analytics/top-clients";
import {
  aggregateDaily,
  aggregateDailyRevenue,
  type DailyBucket,
  type DailyRevenueBucket,
} from "@/lib/analytics/daily";
import {
  computeAtRiskClients,
  computeCohortRetention,
  cohortWindowMature,
  type AtRiskClient,
  type CohortBucket,
  type ClientRetentionProjectRow,
} from "@/lib/analytics/client-retention";
import { loadPipelineVelocity } from "@/lib/analytics/pipeline-velocity";
import { loadCharacterAttribution } from "@/lib/analytics/character-attribution";
import { loadBlogViews } from "@/lib/analytics/blog-views";
import { loadBlogAttribution } from "@/lib/analytics/blog-attribution";
import { loadPricingCalculatorAttribution } from "@/lib/analytics/pricing-calculator-attribution";
import AdminCopySummary from "@/components/admin-copy-summary";
import DailyRevenueSparkline, {
  DailyCountSparkline,
} from "@/components/daily-revenue-sparkline";
import {
  Users,
  Inbox,
  Receipt,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Filter,
  Search,
  Mail,
  Star,
  AlertTriangle,
  Timer,
  Sparkles,
  BookOpen,
  Calculator,
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
  newInquiriesPrev24h: number;
  activeProjects: number;
  totalModels: number;
  activeModels: number;
}

interface OpsSnapshot {
  newsletter7d: number;
  newsletter30d: number;
  pendingReviews: number;
}

async function loadMtdRevenue(): Promise<MtdRevenue> {
  if (!SUPABASE_CONFIGURED) {
    return computeMtdRevenue([]);
  }
  const supabase = await createClient();
  // 60 days covers both current and prior calendar months for any day of
  // the year — a single query feeds both buckets.
  const since60 = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("projects")
    .select("updated_at, invoice_amount")
    .eq("status", "delivered")
    .gte("updated_at", since60)
    .limit(5000);
  return computeMtdRevenue(
    (data ?? []) as { updated_at: string; invoice_amount: number | null }[]
  );
}

interface StuckPipeline {
  count: number;
  value: number;
}

async function loadStuckPipeline(): Promise<StuckPipeline> {
  if (!SUPABASE_CONFIGURED) return { count: 0, value: 0 };
  const supabase = await createClient();
  // 31d+ stuck: open project (any non-terminal stage) whose created_at is
  // more than 31 days ago. We pull invoice_amount so the alert can quote
  // the at-risk pipeline value, not just the count. Keep the query bounded.
  const cutoff = new Date(Date.now() - 31 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("projects")
    .select("invoice_amount")
    .in("status", ["inquiry", "brief_received", "in_progress", "review"])
    .lt("created_at", cutoff)
    .limit(2000);
  type Row = { invoice_amount: number | null };
  const rows = (data ?? []) as Row[];
  return {
    count: rows.length,
    value: rows.reduce((s, r) => s + (r.invoice_amount ?? 0), 0),
  };
}

interface ClientAnalyticsSnapshot {
  topClients: TopClientAggregate[];
  atRiskClients: AtRiskClient[];
  /** Trailing 6 monthly cohorts × 60/90/180d windows. */
  cohorts: CohortBucket[];
}

async function loadClientAnalytics(): Promise<ClientAnalyticsSnapshot> {
  if (!SUPABASE_CONFIGURED) {
    return { topClients: [], atRiskClients: [], cohorts: [] };
  }
  const supabase = await createClient();
  // Single delivered-projects fetch feeds top contributors, at-risk LTV, and
  // cohort retention. 18 months covers both at-risk lookback and the longest
  // cohort window so we don't issue separate queries.
  const since18mo = new Date(
    Date.now() - 18 * 30 * 86_400_000
  ).toISOString();
  const { data } = await supabase
    .from("projects")
    .select(
      "client_id, invoice_amount, updated_at, client:clients(company, email)"
    )
    .eq("status", "delivered")
    .gte("updated_at", since18mo)
    .limit(10_000);

  type Row = {
    client_id: string | null;
    invoice_amount: number | null;
    updated_at: string;
    client?:
      | { company: string | null; email: string | null }
      | { company: string | null; email: string | null }[]
      | null;
  };
  const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;
  const rows = ((data ?? []) as Row[]).map((r) => ({
    client_id: r.client_id,
    invoice_amount: r.invoice_amount,
    updated_at: r.updated_at,
    client: pickOne(r.client),
  }));

  // Top contributors stay scoped to the original 90d window for parity with
  // the existing card. The other two helpers want the full 18-month dataset.
  const ninetyAgoMs = Date.now() - 90 * 86_400_000;
  const top90dRows: DeliveredProjectRow[] = rows
    .filter((r) => new Date(r.updated_at).getTime() >= ninetyAgoMs)
    .map((r) => ({
      client_id: r.client_id,
      invoice_amount: r.invoice_amount,
      client: r.client,
    }));
  const retentionRows: ClientRetentionProjectRow[] = rows.map((r) => ({
    client_id: r.client_id,
    invoice_amount: r.invoice_amount,
    delivered_at: r.updated_at,
    client: r.client,
  }));

  return {
    topClients: aggregateTopClients(top90dRows, 5),
    atRiskClients: computeAtRiskClients(retentionRows, {
      minDelivered: 2,
      silentDays: 60,
      limit: 20,
    }),
    cohorts: computeCohortRetention(retentionRows, { months: 6 }),
  };
}

interface TrendingNowRow {
  id: string;
  name: string;
  view_count_30d: number;
}

async function loadTrendingNow(): Promise<TrendingNowRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  // Cheap secondary signal — popularity view already exists. Top-5 by 30d
  // views surfaces what the operator should be staffing this week.
  const { data } = await supabase
    .from("models_with_popularity")
    .select("id, name, view_count_30d")
    .eq("status", "active")
    .order("view_count_30d", { ascending: false })
    .gt("view_count_30d", 0)
    .limit(5);
  return (data as TrendingNowRow[] | null) ?? [];
}

interface WowSnapshot {
  inquiries: WowMetric;
  delivered: WowMetric;
  revenue: WowMetric;
}

async function loadWowAndDailyRevenue(): Promise<{
  wow: WowSnapshot;
  daily: DailyRevenueBucket[];
  dailyInquiries: DailyBucket[];
}> {
  if (!SUPABASE_CONFIGURED) {
    const empty: WowMetric = { current: 0, previous: 0, delta: 0, pct: null };
    return {
      wow: { inquiries: empty, delivered: empty, revenue: empty },
      daily: aggregateDailyRevenue([], 14),
      dailyInquiries: aggregateDaily([], 14),
    };
  }
  const supabase = await createClient();
  // 14 days is enough to cover both the WoW current+previous buckets and
  // the two sparkline windows — one delivered fetch + one inquiry fetch
  // power all four widgets.
  const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: inqRows }, { data: delRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("created_at")
      .gte("created_at", since14)
      .limit(5000),
    supabase
      .from("projects")
      .select("updated_at, invoice_amount")
      .eq("status", "delivered")
      .gte("updated_at", since14)
      .limit(5000),
  ]);
  // Same rows feed both the WoW chip (current vs prior 7d) and the daily
  // sparkline — keeps the two views from disagreeing on the lead count.
  const inquiriesAll = (inqRows ?? []) as { created_at: string }[];
  const delivered = (delRows ?? []) as {
    updated_at: string;
    invoice_amount: number | null;
  }[];
  return {
    wow: {
      inquiries: wowFromRows(inquiriesAll),
      delivered: wowFromRows(delivered, { dateField: "updated_at" }),
      revenue: wowFromRows(delivered, {
        dateField: "updated_at",
        weighted: true,
      }),
    },
    daily: aggregateDailyRevenue(delivered, 14),
    dailyInquiries: aggregateDaily(inquiriesAll, 14),
  };
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
      newInquiriesPrev24h: 0,
      activeProjects: 0,
      totalModels: list.length,
      activeModels: list.filter((m) => m.status === "active").length,
    };
  }
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Previous 24h window: [48h ago, 24h ago) — same width, contiguous past.
  // Used purely as a directional chip; absolute numbers stay in the KPI card.
  const prevStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const prevEnd = since;

  const [
    { count: newInquiries24h },
    { count: newInquiriesPrev24h },
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
      .eq("status", "inquiry")
      .gte("created_at", prevStart)
      .lt("created_at", prevEnd),
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
    newInquiriesPrev24h: newInquiriesPrev24h ?? 0,
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
  const [
    kpis,
    usage,
    recent,
    funnel,
    bySource,
    search7d,
    ops,
    sla,
    wowDaily,
    trendingNow,
    mtd,
    clientAnalytics,
    stuck,
    velocity,
    characterAttribution30d,
    blogViews30d,
    blogAttribution30d,
    pricingCalc30d,
  ] = await Promise.all([
    loadKPIs(),
    summarizeUsage(),
    loadRecentInquiries(),
    loadFunnel(30),
    loadFunnelBySource(30, 6),
    loadSearchAnalytics({ windowDays: 7, limit: 5 }),
    loadOpsSnapshot(),
    loadResponseSla(30),
    loadWowAndDailyRevenue(),
    loadTrendingNow(),
    loadMtdRevenue(),
    loadClientAnalytics(),
    loadStuckPipeline(),
    loadPipelineVelocity(90),
    loadCharacterAttribution(30),
    loadBlogViews(30),
    loadBlogAttribution(30),
    loadPricingCalculatorAttribution(30),
  ]);
  const wow = wowDaily.wow;
  const dailyRevenue = wowDaily.daily;
  const dailyInquiries = wowDaily.dailyInquiries;
  const { topClients, atRiskClients, cohorts } = clientAnalytics;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-sm text-zinc-500 mt-1">
            오늘의 핵심 지표와 빠른 이동.
          </p>
        </div>
        {(() => {
          // Plain-text summary — paste-ready for chat / standup notes.
          // Numbers come straight from the same loaders the cards render,
          // so the copy never drifts from what the operator sees on screen.
          const fmt = (m: WowMetric, label: string) => {
            if (m.pct === null) {
              return m.current > 0 ? `${label} ${m.current}` : `${label} 0`;
            }
            const sign = m.delta >= 0 ? "+" : "";
            return `${label} ${m.current} (${sign}${m.pct.toFixed(0)}%)`;
          };
          const today = new Date().toLocaleDateString("ko-KR");
          // Retention summary uses only mature cohorts so the copy is honest
          // about what's measurable today vs ripening data.
          const matureCohorts90 = cohorts.filter(
            (c) => c.size > 0 && cohortWindowMature(c.cohortMonth, 90)
          );
          const retentionAvg =
            matureCohorts90.length > 0
              ? matureCohorts90.reduce(
                  (s, c) => s + (c.repeat90dRate ?? 0),
                  0
                ) / matureCohorts90.length
              : null;
          const atRiskLtv = atRiskClients.reduce(
            (s, c) => s + c.totalRevenue,
            0
          );
          const text = [
            `[Virtual Agency · ${today}]`,
            `신규 문의 24h: ${kpis.newInquiries24h} (어제 ${kpis.newInquiriesPrev24h})`,
            `진행 중 프로젝트: ${kpis.activeProjects}`,
            `활성 모델: ${kpis.activeModels}/${kpis.totalModels}`,
            mtd.mtdRevenue > 0
              ? `MTD 매출: ₩${mtd.mtdRevenue.toLocaleString("ko-KR")} (월말 예상 ₩${mtd.projectedMonthEnd.toLocaleString("ko-KR")})`
              : null,
            `WoW: ${fmt(wow.inquiries, "문의")} / ${fmt(wow.delivered, "납품")} / ${fmt(wow.revenue, "매출")}`,
            atRiskClients.length > 0
              ? `LTV at-risk: ${atRiskClients.length}건 / ₩${atRiskLtv.toLocaleString("ko-KR")}`
              : null,
            retentionAvg !== null
              ? `90일 재구매율 (mature ${matureCohorts90.length}개 평균): ${(retentionAvg * 100).toFixed(0)}%`
              : null,
            velocity.n > 0 && velocity.medianDays !== null
              ? `납품 lead time (90d 중앙값): ${velocity.medianDays.toFixed(1)}d${
                  velocity.p90Days !== null
                    ? ` · p90 ${velocity.p90Days.toFixed(1)}d`
                    : ""
                } · ${velocity.n}건`
              : null,
          ]
            .filter(Boolean)
            .join("\n");
          return <AdminCopySummary text={text} />;
        })()}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(() => {
          // Today-vs-yesterday chip. Show "신규" when prev was zero so the
          // user gets a positive signal even without a comparison anchor.
          const cur = kpis.newInquiries24h;
          const prev = kpis.newInquiriesPrev24h;
          const delta = cur - prev;
          const pct = prev > 0 ? (delta / prev) * 100 : null;
          const text =
            pct === null
              ? cur > 0
                ? "어제는 0건"
                : "어제도 0건"
              : `어제 대비 ${delta >= 0 ? "+" : ""}${pct.toFixed(0)}% (${
                  prev
                }건)`;
          const tone =
            pct === null
              ? "text-zinc-500"
              : delta > 0
              ? "text-emerald-400"
              : delta < 0
              ? "text-rose-400"
              : "text-zinc-500";
          return (
            <KPI
              icon={Inbox}
              label="신규 문의 (24h)"
              value={cur.toLocaleString()}
              href="/admin/inbox?status=inquiry"
              accent={cur > 0 ? "bg-yellow-500/15 text-yellow-300" : ""}
              chip={{ text, tone }}
            />
          );
        })()}
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

      {stuck.count > 0 && (
        <Link
          href="/admin/forecast#aging"
          className="block rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 hover:bg-rose-500/10 transition-colors"
        >
          <div className="flex items-center gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <p className="flex-1 text-rose-100">
              <span className="font-semibold">{stuck.count}건</span> 의
              프로젝트가 31일+ 정체 중 (
              <span className="tabular-nums">
                ₩{stuck.value.toLocaleString("ko-KR")}
              </span>
              {" "}at risk). Forecast 의 체류 시간 섹션에서 확인 →
            </p>
            <ArrowRight className="w-4 h-4 text-rose-300 shrink-0" />
          </div>
        </Link>
      )}

      {(atRiskClients.length > 0 ||
        cohorts.some((c) => c.size > 0) ||
        velocity.n > 0) && (() => {
        // Retention summary = avg 90d repeat rate across MATURE cohorts only.
        // Immature cohorts would drag the number down because their window
        // hasn't fully elapsed yet, distorting the trend signal.
        const mature90 = cohorts.filter(
          (c) => c.size > 0 && cohortWindowMature(c.cohortMonth, 90)
        );
        const avg90 =
          mature90.length > 0
            ? mature90.reduce((s, c) => s + (c.repeat90dRate ?? 0), 0) /
              mature90.length
            : null;
        const atRiskLtv = atRiskClients.reduce(
          (s, c) => s + c.totalRevenue,
          0
        );
        const gridCols =
          velocity.n > 0
            ? "grid-cols-1 md:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2";
        return (
          <section className={`grid ${gridCols} gap-4`}>
            <Link
              href="/admin/clients?filter=at-risk"
              className={`block rounded-xl border p-5 transition-colors ${
                atRiskClients.length > 0
                  ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  LTV at-risk 광고주
                </p>
                <Users className="w-4 h-4 text-zinc-500" />
              </div>
              <p
                className={`mt-3 text-2xl font-bold tabular-nums ${
                  atRiskClients.length > 0 ? "text-rose-200" : "text-zinc-300"
                }`}
              >
                {atRiskClients.length}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 tabular-nums">
                ₩{atRiskLtv.toLocaleString("ko-KR")} 누적 LTV · 재활성화 타깃 →
              </p>
            </Link>
            <Link
              href="/admin/clients"
              className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  90일 재구매율 (mature cohorts)
                </p>
                <TrendingUp className="w-4 h-4 text-zinc-500" />
              </div>
              <p
                className={`mt-3 text-2xl font-bold tabular-nums ${
                  avg90 === null
                    ? "text-zinc-500"
                    : avg90 >= 0.3
                    ? "text-emerald-300"
                    : "text-zinc-200"
                }`}
              >
                {avg90 === null ? "—" : `${(avg90 * 100).toFixed(0)}%`}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {mature90.length > 0
                  ? `${mature90.length}개 코호트 평균 · 30% 이상이 건강한 LTV 채널`
                  : "코호트 데이터 축적 중 — 90일 더 지나야 의미 있는 값"}
              </p>
            </Link>
            {velocity.n > 0 && (
              <Link
                href="/admin/forecast"
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    납품 lead time (90일 중앙값)
                  </p>
                  <Timer className="w-4 h-4 text-zinc-500" />
                </div>
                {/* (lead time number rendered just below) */}
                <p
                  className={`mt-3 text-2xl font-bold tabular-nums ${
                    velocity.medianDays === null
                      ? "text-zinc-500"
                      : velocity.medianDays <= 7
                      ? "text-emerald-300"
                      : velocity.medianDays >= 21
                      ? "text-rose-300"
                      : "text-zinc-200"
                  }`}
                >
                  {velocity.medianDays === null
                    ? "—"
                    : `${velocity.medianDays.toFixed(1)}d`}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 tabular-nums">
                  {velocity.p90Days !== null
                    ? `${velocity.n}건 · p90 ${velocity.p90Days.toFixed(1)}d`
                    : `${velocity.n}건 측정`}
                </p>
              </Link>
            )}
          </section>
        );
      })()}

      {(characterAttribution30d.totalInquiries > 0 ||
        blogViews30d.total > 0 ||
        blogAttribution30d.totalInquiries > 0 ||
        pricingCalc30d.totalInquiries > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {characterAttribution30d.totalInquiries > 0 && (
            <Link
              href="/admin/analytics"
              className="block rounded-xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  캐릭터 페이지 → 문의 (30일)
                </p>
                <Sparkles className="w-4 h-4 text-violet-300" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-violet-100">
                {characterAttribution30d.totalInquiries}
                <span className="text-sm text-violet-300/60 ml-2">건</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                납품 {characterAttribution30d.totalDelivered} ·{" "}
                {characterAttribution30d.totalRevenue > 0 ? (
                  <span className="text-emerald-300">
                    ₩{characterAttribution30d.totalRevenue.toLocaleString("ko-KR")}
                  </span>
                ) : (
                  <span className="text-zinc-500">대기 중</span>
                )}
                {" "}· utm_source=character
              </p>
            </Link>
          )}
          {blogAttribution30d.totalInquiries > 0 && (
            <Link
              href="/admin/analytics"
              className="block rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  블로그 → 문의 (30일)
                </p>
                <BookOpen className="w-4 h-4 text-cyan-300" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-cyan-100">
                {blogAttribution30d.totalInquiries}
                <span className="text-sm text-cyan-300/60 ml-2">건</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                납품 {blogAttribution30d.totalDelivered} ·{" "}
                {blogAttribution30d.totalRevenue > 0 ? (
                  <span className="text-emerald-300">
                    ₩{blogAttribution30d.totalRevenue.toLocaleString("ko-KR")}
                  </span>
                ) : (
                  <span className="text-zinc-500">대기 중</span>
                )}
                {" "}· referrer=/blog/*
              </p>
            </Link>
          )}
          {blogViews30d.total > 0 && (
            <Link
              href="/admin/blog-analytics"
              className="block rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  블로그 조회 (30일)
                </p>
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-emerald-100">
                {blogViews30d.total.toLocaleString()}
                <span className="text-sm text-emerald-300/60 ml-2">건</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                KR {blogViews30d.totalKo} · EN {blogViews30d.totalEn}
                {blogViews30d.bySlug.length > 0 && (
                  <> · 1위 {blogViews30d.bySlug[0].total}회</>
                )}
                {" "}· /admin/blog-analytics
              </p>
            </Link>
          )}
          {pricingCalc30d.totalInquiries > 0 && (
            <Link
              href="/admin/analytics"
              className="block rounded-xl border border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 transition-colors p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  가격 계산기 → 문의 (30일)
                </p>
                <Calculator className="w-4 h-4 text-teal-300" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-teal-100">
                {pricingCalc30d.totalInquiries}
                <span className="text-sm text-teal-300/60 ml-2">건</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                납품 {pricingCalc30d.totalDelivered} ·{" "}
                {pricingCalc30d.totalRevenue > 0 ? (
                  <span className="text-emerald-300">
                    ₩{pricingCalc30d.totalRevenue.toLocaleString("ko-KR")}
                  </span>
                ) : (
                  <span className="text-zinc-500">대기 중</span>
                )}
                {pricingCalc30d.byPath.length > 0 && (
                  <> · 1위 {pricingCalc30d.byPath[0].path}</>
                )}
              </p>
            </Link>
          )}
        </section>
      )}

      {mtd.mtdRevenue > 0 || mtd.priorMonthTotal > 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Month-to-Date 매출
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                {mtd.daysElapsed}/{mtd.daysInMonth}일 경과
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">
                ₩{mtd.mtdRevenue.toLocaleString("ko-KR")}
              </p>
              <p className="text-[11px] text-zinc-500 tabular-nums">
                월말 예상 ₩{mtd.projectedMonthEnd.toLocaleString("ko-KR")}
              </p>
              <a
                href="/api/admin/exports/mtd"
                download
                className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
              >
                CSV
              </a>
            </div>
          </div>
          {mtd.priorMonthTotal > 0 ? (
            (() => {
              const projPct = Math.min(
                100,
                (mtd.projectedMonthEnd / mtd.priorMonthTotal) * 100
              );
              const beating = mtd.projectedMonthEnd >= mtd.priorMonthTotal;
              return (
                <>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden relative">
                    <div
                      className={`h-full transition-all ${
                        beating ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${projPct}%` }}
                    />
                    {/* Last-month total marker */}
                    <div className="absolute top-0 bottom-0 left-full -ml-px w-0.5 bg-zinc-300/30" />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500 tabular-nums">
                    이전월 총 ₩{mtd.priorMonthTotal.toLocaleString("ko-KR")}{" "}
                    {beating ? (
                      <span className="text-emerald-400">
                        · 페이스 +{(projPct - 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-amber-400">
                        · 페이스 -{(100 - projPct).toFixed(0)}%
                      </span>
                    )}
                  </p>
                </>
              );
            })()
          ) : (
            <p className="text-[11px] text-zinc-500">
              이전월 매출 데이터 없음 — 비교 기준선이 다음 달부터 형성됩니다.
            </p>
          )}
        </section>
      ) : null}

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

      {trendingNow.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              지금 트렌딩 (30d 노출)
            </h2>
            <div className="flex items-center gap-3">
              <a
                href="/api/admin/exports/trending"
                download
                className="text-[11px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
              >
                CSV
              </a>
              <Link
                href="/trending"
                className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
              >
                공개 페이지 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {trendingNow.map((m, i) => (
              <li key={m.id}>
                <Link
                  href={`/admin/models/${m.id}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 hover:border-zinc-600 transition-colors"
                >
                  <p className="text-[10px] text-zinc-500 tabular-nums">
                    #{i + 1}
                  </p>
                  <p className="font-medium text-sm truncate mt-0.5">{m.name}</p>
                  <p className="text-[11px] text-emerald-400 mt-1 tabular-nums">
                    {m.view_count_30d.toLocaleString()} views · 30d
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(dailyRevenue.some((b) => b.revenue > 0) ||
        dailyInquiries.some((b) => b.count > 0) ||
        blogViews30d.daily.slice(-14).some((b) => b.count > 0)) && (() => {
        // Summary stats from the same dense series so the chart, the headline
        // total, and the "high day" caption can never disagree.
        const total = dailyRevenue.reduce((s, b) => s + b.revenue, 0);
        const totalCount = dailyRevenue.reduce((s, b) => s + b.count, 0);
        const activeDays = dailyRevenue.filter((b) => b.revenue > 0).length;
        const peak = dailyRevenue.reduce(
          (best, b) => (b.revenue > best.revenue ? b : best),
          dailyRevenue[0] ?? { date: "", revenue: 0, count: 0 }
        );
        const inqTotal = dailyInquiries.reduce((s, b) => s + b.count, 0);
        const inqActiveDays = dailyInquiries.filter((b) => b.count > 0).length;
        const inqPeak = dailyInquiries.reduce(
          (best, b) => (b.count > best.count ? b : best),
          dailyInquiries[0] ?? { date: "", count: 0 }
        );
        // Slice the 30d blog daily series down to the same 14-day window
        // as the revenue + inquiry charts so the three sparklines line up
        // visually on the same x-axis.
        const blogDaily14d = blogViews30d.daily.slice(-14);
        const blogTotal14d = blogDaily14d.reduce((s, b) => s + b.count, 0);
        const blogActiveDays = blogDaily14d.filter((b) => b.count > 0).length;
        const blogPeak = blogDaily14d.reduce(
          (best, b) => (b.count > best.count ? b : best),
          blogDaily14d[0] ?? { date: "", count: 0 }
        );
        const showBlog = blogTotal14d > 0;
        return (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
              지난 14일 추세
            </h2>
            <div
              className={
                showBlog
                  ? "grid grid-cols-1 md:grid-cols-3 gap-6"
                  : "grid grid-cols-1 md:grid-cols-2 gap-6"
              }
            >
              <div>
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-400">
                      일별 매출
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      총 ₩{new Intl.NumberFormat("ko-KR").format(total)} · {totalCount}건 · {activeDays}일 활성
                    </p>
                  </div>
                  {peak.revenue > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        최고일
                      </p>
                      <p className="text-[11px] text-zinc-300 tabular-nums">
                        {peak.date}
                      </p>
                      <p className="text-[11px] text-zinc-300 tabular-nums">
                        ₩{new Intl.NumberFormat("ko-KR").format(peak.revenue)}
                      </p>
                    </div>
                  )}
                </div>
                <DailyRevenueSparkline buckets={dailyRevenue} width={showBlog ? 280 : 420} />
              </div>
              <div>
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-400">
                      일별 신규 문의
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      총 {inqTotal}건 · {inqActiveDays}일 활성
                    </p>
                  </div>
                  {inqPeak.count > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        최고일
                      </p>
                      <p className="text-[11px] text-zinc-300 tabular-nums">
                        {inqPeak.date}
                      </p>
                      <p className="text-[11px] text-zinc-300 tabular-nums">
                        {inqPeak.count}건
                      </p>
                    </div>
                  )}
                </div>
                <DailyCountSparkline
                  buckets={dailyInquiries}
                  width={showBlog ? 280 : 420}
                  ariaLabel="지난 14일 신규 문의"
                />
              </div>
              {showBlog && (
                <div>
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-zinc-400">
                        일별 블로그 조회
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        총 {blogTotal14d.toLocaleString()}회 · {blogActiveDays}일 활성
                      </p>
                    </div>
                    {blogPeak.count > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                          최고일
                        </p>
                        <p className="text-[11px] text-zinc-300 tabular-nums">
                          {blogPeak.date}
                        </p>
                        <p className="text-[11px] text-zinc-300 tabular-nums">
                          {blogPeak.count}회
                        </p>
                      </div>
                    )}
                  </div>
                  <DailyCountSparkline
                    buckets={blogDaily14d}
                    width={280}
                    unit="회"
                    ariaLabel="지난 14일 블로그 조회"
                    fillActive="#10b981"
                    fillLast="#34d399"
                  />
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] text-zinc-600">
              막대에 마우스를 올리면 일별 값이 표시됩니다. 회색은 0건/0원 (해당일 활동 없음).
            </p>
          </section>
        );
      })()}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            주간 변화 (지난 7일 vs 그 직전 7일)
          </h2>
          <a
            href="/api/admin/exports/wow"
            download
            className="text-[11px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
          >
            CSV
          </a>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          최근 한 주가 직전 주보다 더 좋아졌는지를 본다 — 트렌드만 보는 지표라 절대값은 KPI 카드 참조.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WowCard label="신규 문의" m={wow.inquiries} format={(v) => v.toLocaleString()} />
          <WowCard label="납품" m={wow.delivered} format={(v) => v.toLocaleString()} />
          <WowCard
            label="납품 매출 (₩)"
            m={wow.revenue}
            format={(v) => `₩${v.toLocaleString("ko-KR")}`}
          />
        </div>
      </section>

      {topClients.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              매출 기여 광고주 Top {topClients.length} (90일)
            </h2>
            <Link
              href="/admin/clients"
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 ml-auto"
            >
              전체 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {(() => {
            const total = topClients.reduce((s, c) => s + c.revenue, 0);
            return (
              <ul className="space-y-2 text-sm">
                {topClients.map((c) => {
                  const sharePct = total > 0 ? (c.revenue / total) * 100 : 0;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="w-40 shrink-0 text-zinc-200 truncate"
                        title={c.email ?? undefined}
                      >
                        {c.company}
                      </span>
                      <span className="text-zinc-500 tabular-nums shrink-0 w-10 text-right">
                        {c.delivered}
                      </span>
                      <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-zinc-200 shrink-0 w-32 text-right">
                        ₩{c.revenue.toLocaleString("ko-KR")}
                      </span>
                      <span className="tabular-nums text-zinc-500 shrink-0 w-14 text-right">
                        {sharePct.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
          <p className="mt-3 text-[11px] text-zinc-600">
            상위 5 광고주의 90일 누적 매출 — 집중도가 너무 높으면 재구매 외 신규 lead 다각화 필요.
          </p>
        </section>
      )}

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
  chip,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  href: string;
  accent?: string;
  chip?: { text: string; tone: string };
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
      {chip && (
        <p className={`mt-1.5 text-[11px] tabular-nums ${chip.tone}`}>
          {chip.text}
        </p>
      )}
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

function WowCard({
  label,
  m,
  format,
}: {
  label: string;
  m: WowMetric;
  format: (v: number) => string;
}) {
  // ±1pp threshold prevents the arrow flipping back and forth on flat metrics.
  const Trend = m.delta > 0 ? TrendingUp : m.delta < 0 ? TrendingDown : Minus;
  const tone =
    m.delta > 0
      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
      : m.delta < 0
      ? "text-rose-300 bg-rose-500/10 border-rose-500/30"
      : "text-zinc-400 bg-zinc-800/40 border-zinc-700";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{format(m.current)}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${tone}`}
        >
          <Trend className="w-3 h-3" />
          {m.pct === null
            ? m.current > 0
              ? "신규"
              : "—"
            : `${m.delta >= 0 ? "+" : ""}${m.pct.toFixed(1)}%`}
        </span>
        <span className="text-zinc-600 tabular-nums">
          이전주 {format(m.previous)}
        </span>
      </div>
    </div>
  );
}
