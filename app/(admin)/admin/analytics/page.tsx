import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { BarChart3, TrendingUp } from "lucide-react";
import { INDUSTRY_LABELS } from "@/lib/tags";
import { aggregateDaily, type DailyBucket } from "@/lib/analytics/daily";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Virtual Agency" };

const WINDOWS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

interface ProjectAgg {
  model_id: string | null;
  status: string;
  utm_source?: string | null;
  model?: {
    name: string | null;
    concept_image: string | null;
    industry_tags: string[] | null;
  } | null;
}

interface TopModel {
  id: string;
  name: string;
  concept_image: string | null;
  inquiries: number;
  delivered: number;
}

interface IndustryStat {
  industry: string;
  inquiries: number;
}

interface SourceStat {
  source: string;
  inquiries: number;
  delivered: number;
}

async function loadAnalytics(windowDays: number): Promise<{
  totalInquiries: number;
  totalDelivered: number;
  conversionPct: number;
  topModels: TopModel[];
  byIndustry: IndustryStat[];
  bySource: SourceStat[];
  daily: DailyBucket[];
  windowDays: number;
}> {
  if (!SUPABASE_CONFIGURED) {
    return {
      totalInquiries: 0,
      totalDelivered: 0,
      conversionPct: 0,
      topModels: [],
      byIndustry: [],
      bySource: [],
      daily: aggregateDaily([], windowDays),
      windowDays,
    };
  }
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const dailyAgo = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const [{ data }, daily] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "model_id, status, utm_source, model:models(name, concept_image, industry_tags)"
      )
      .gte("created_at", since),
    supabase
      .from("projects")
      .select("created_at")
      .gte("created_at", dailyAgo),
  ]);

  const projects = (data as unknown as ProjectAgg[]) ?? [];
  const dailyRows = ((daily.data ?? []) as { created_at: string }[]);
  const dailySeries = aggregateDaily(dailyRows, windowDays);
  const totalInquiries = projects.length;
  const totalDelivered = projects.filter((p) => p.status === "delivered").length;
  const conversionPct =
    totalInquiries > 0 ? Math.round((totalDelivered / totalInquiries) * 100) : 0;

  const byModelMap = new Map<string, TopModel>();
  for (const p of projects) {
    if (!p.model_id || !p.model) continue;
    const entry = byModelMap.get(p.model_id) ?? {
      id: p.model_id,
      name: p.model.name ?? "—",
      concept_image: p.model.concept_image,
      inquiries: 0,
      delivered: 0,
    };
    entry.inquiries += 1;
    if (p.status === "delivered") entry.delivered += 1;
    byModelMap.set(p.model_id, entry);
  }
  const topModels = [...byModelMap.values()]
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  const industryMap = new Map<string, number>();
  for (const p of projects) {
    for (const ind of p.model?.industry_tags ?? []) {
      industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
    }
  }
  const byIndustry = [...industryMap.entries()]
    .map(([industry, inquiries]) => ({ industry, inquiries }))
    .sort((a, b) => b.inquiries - a.inquiries);

  // Source breakdown — buckets unknown/missing as "(direct)" so the row
  // is never lost. Same shape as funnel-by-source on the admin home but
  // includes delivered counts here for conversion comparison.
  const sourceMap = new Map<string, { inquiries: number; delivered: number }>();
  for (const p of projects) {
    const src = p.utm_source ?? "(direct)";
    const bucket = sourceMap.get(src) ?? { inquiries: 0, delivered: 0 };
    bucket.inquiries += 1;
    if (p.status === "delivered") bucket.delivered += 1;
    sourceMap.set(src, bucket);
  }
  const bySource: SourceStat[] = [...sourceMap.entries()]
    .map(([source, b]) => ({ source, ...b }))
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  return {
    totalInquiries,
    totalDelivered,
    conversionPct,
    topModels,
    byIndustry,
    bySource,
    daily: dailySeries,
    windowDays,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const sp = await searchParams;
  const windowDays = WINDOWS[sp.window ?? ""] ?? 30;
  const a = await loadAnalytics(windowDays);
  const maxModelInquiries = Math.max(1, ...a.topModels.map((m) => m.inquiries));
  const maxIndustry = Math.max(1, ...a.byIndustry.map((i) => i.inquiries));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            최근 90일 프로젝트 흐름. 어떤 모델이 견인하고 어떤 산업이 활발한지.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Card label="총 문의" value={a.totalInquiries.toLocaleString()} />
        <Card label="납품 완료" value={a.totalDelivered.toLocaleString()} />
        <Card label="전환율" value={`${a.conversionPct}%`} />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {a.windowDays}일 일별 문의 추세
          </h2>
          <div className="ml-auto flex items-center gap-1 text-[11px]">
            {(["7", "30", "90"] as const).map((w) => {
              const active = a.windowDays === Number(w);
              const href = w === "30" ? "/admin/analytics" : `/admin/analytics?window=${w}`;
              return (
                <Link
                  key={w}
                  href={href}
                  className={`px-2 py-0.5 rounded border ${
                    active
                      ? "bg-zinc-100 text-black border-zinc-100"
                      : "text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {w}d
                </Link>
              );
            })}
            <span className="ml-2 text-zinc-600 tabular-nums">
              {a.daily.reduce((sum, d) => sum + d.count, 0)} 건 · KST
            </span>
          </div>
        </div>
        {(() => {
          const peak = Math.max(1, ...a.daily.map((d) => d.count));
          return (
            <div className="flex items-end gap-px h-32">
              {a.daily.map((d) => {
                const heightPct = (d.count / peak) * 100;
                const isWeekStart = d.date.endsWith("-01") || d.date.endsWith("01");
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col justify-end group relative"
                    title={`${d.date} — ${d.count}건`}
                  >
                    <div
                      className={`w-full rounded-sm transition-colors ${
                        d.count > 0
                          ? "bg-zinc-500 group-hover:bg-emerald-400"
                          : "bg-zinc-900"
                      }`}
                      style={{ height: `${Math.max(2, heightPct)}%` }}
                    />
                    {isWeekStart && (
                      <span className="absolute -bottom-4 left-0 text-[9px] text-zinc-700 tabular-nums">
                        {d.date.slice(5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        <p className="mt-6 text-[10px] text-zinc-600">
          가장 왼쪽 = {a.windowDays}일 전, 가장 오른쪽 = 오늘. 마우스 오버 시 일자·건수 표시.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          Top 모델 (문의 수)
        </h2>
        {a.topModels.length === 0 ? (
          <p className="text-sm text-zinc-600">데이터 없음</p>
        ) : (
          <ul className="space-y-2">
            {a.topModels.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Link
                  href={`/admin/models/${m.id}`}
                  className="text-sm font-medium w-40 truncate hover:text-zinc-300"
                >
                  {m.name}
                </Link>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-400 transition-all"
                    style={{
                      width: `${(m.inquiries / maxModelInquiries) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums w-24 text-right">
                  {m.inquiries} 문의 · {m.delivered} 납품
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          산업별 분포
        </h2>
        {a.byIndustry.length === 0 ? (
          <p className="text-sm text-zinc-600">데이터 없음</p>
        ) : (
          <ul className="space-y-2">
            {a.byIndustry.map((i) => (
              <li key={i.industry} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-zinc-300">
                  {INDUSTRY_LABELS[i.industry] ?? i.industry}
                </span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-400"
                    style={{ width: `${(i.inquiries / maxIndustry) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums w-16 text-right">
                  {i.inquiries}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          유입 채널 (utm_source · 90d)
        </h2>
        {a.bySource.length === 0 ? (
          <p className="text-sm text-zinc-600">데이터 없음</p>
        ) : (
          (() => {
            const maxSource = Math.max(1, ...a.bySource.map((s) => s.inquiries));
            return (
              <ul className="space-y-2">
                {a.bySource.map((s) => {
                  const convPct =
                    s.inquiries > 0
                      ? Math.round((s.delivered / s.inquiries) * 100)
                      : 0;
                  return (
                    <li
                      key={s.source}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-28 text-zinc-300 truncate" title={s.source}>
                        {s.source}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-zinc-400"
                          style={{
                            width: `${(s.inquiries / maxSource) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 tabular-nums w-32 text-right">
                        {s.inquiries} 문의 ·{" "}
                        <span
                          className={
                            convPct >= 30 ? "text-emerald-400" : "text-zinc-500"
                          }
                        >
                          {convPct}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          })()
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
