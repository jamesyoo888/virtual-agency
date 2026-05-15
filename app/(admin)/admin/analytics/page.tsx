import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { BarChart3 } from "lucide-react";
import { INDUSTRY_LABELS } from "@/lib/tags";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Virtual Agency" };

interface ProjectAgg {
  model_id: string | null;
  status: string;
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

async function loadAnalytics(): Promise<{
  totalInquiries: number;
  totalDelivered: number;
  conversionPct: number;
  topModels: TopModel[];
  byIndustry: IndustryStat[];
}> {
  if (!SUPABASE_CONFIGURED) {
    return {
      totalInquiries: 0,
      totalDelivered: 0,
      conversionPct: 0,
      topModels: [],
      byIndustry: [],
    };
  }
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("projects")
    .select(
      "model_id, status, model:models(name, concept_image, industry_tags)"
    )
    .gte("created_at", since);

  const projects = (data as unknown as ProjectAgg[]) ?? [];
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

  return { totalInquiries, totalDelivered, conversionPct, topModels, byIndustry };
}

export default async function AnalyticsPage() {
  const a = await loadAnalytics();
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
