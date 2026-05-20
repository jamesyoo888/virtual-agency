import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { EXPERIMENTS } from "@/lib/experiments";
import {
  rateString,
  wilsonLower,
  relativeLift,
  formatLift,
} from "@/lib/experiments-stats";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import ForceVariantPicker from "@/components/admin-force-variant-picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Experiments — Virtual Agency" };

type SegmentDim = "overall" | "device" | "visitor_type";

const SEGMENT_LABELS: Record<SegmentDim, string> = {
  overall: "Overall",
  device: "By device",
  visitor_type: "New vs Returning",
};

interface VariantRow {
  variant: string;
  segment: string; // 'overall' for the unsegmented row, otherwise device/visitor type value
  impressions: number;
  conversions: number;
}

interface ExperimentReport {
  key: string;
  variants: VariantRow[];
}

interface EventRow {
  key: string;
  variant: string;
  kind: string;
  device: string | null;
  visitor_type: string | null;
}

function isSegmentDim(v: string | undefined): v is SegmentDim {
  return v === "overall" || v === "device" || v === "visitor_type";
}

/**
 * Aggregates the raw event rows into per-(variant × segment) counters. The
 * segment dimension is chosen by the caller; 'overall' bucket sums every
 * row regardless of device / visitor type.
 */
function aggregate(events: EventRow[], dim: SegmentDim): ExperimentReport[] {
  const map = new Map<string, Map<string, { impressions: number; conversions: number }>>();

  // Seed entries for every declared variant so the dashboard renders even
  // when no events have come in yet for some buckets.
  for (const def of Object.values(EXPERIMENTS)) {
    const inner = new Map<string, { impressions: number; conversions: number }>();
    for (const v of def.variants) {
      const seedSegment = dim === "overall" ? "overall" : "unknown";
      inner.set(`${v}::${seedSegment}`, { impressions: 0, conversions: 0 });
    }
    map.set(def.key, inner);
  }

  for (const row of events) {
    let inner = map.get(row.key);
    if (!inner) {
      inner = new Map();
      map.set(row.key, inner);
    }
    const segment =
      dim === "overall"
        ? "overall"
        : (row[dim] ?? "unknown") || "unknown";
    const k = `${row.variant}::${segment}`;
    const entry = inner.get(k) ?? { impressions: 0, conversions: 0 };
    if (row.kind === "impression") entry.impressions += 1;
    else if (row.kind === "conversion") entry.conversions += 1;
    inner.set(k, entry);
  }

  return [...map.entries()].map(([key, inner]) => ({
    key,
    variants: [...inner.entries()]
      .map(([k, counts]) => {
        const [variant, segment] = k.split("::");
        return { variant, segment, ...counts };
      })
      .sort((a, b) => a.variant.localeCompare(b.variant) || a.segment.localeCompare(b.segment)),
  }));
}

async function loadReport(dim: SegmentDim): Promise<ExperimentReport[]> {
  if (!SUPABASE_CONFIGURED) return aggregate([], dim);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiment_events")
    .select("key, variant, kind, device, visitor_type");
  if (error) {
    console.warn("[experiments] read failed:", error.message);
    return aggregate([], dim);
  }
  return aggregate((data ?? []) as EventRow[], dim);
}

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ segment?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const segment: SegmentDim = isSegmentDim(sp.segment) ? sp.segment : "overall";
  const report = await loadReport(segment);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-bold">Experiments</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              cookie 기반 A/B 버킷별 노출·전환. 신뢰 구간은 95% Wilson lower bound.
            </p>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- needs real navigation for Content-Disposition download */}
        <a
          href="/api/admin/exports/experiments"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      <nav className="flex items-center gap-2 text-xs">
        {(Object.keys(SEGMENT_LABELS) as SegmentDim[]).map((dim) => {
          const active = dim === segment;
          return (
            <Link
              key={dim}
              href={dim === "overall" ? "/admin/experiments" : `/admin/experiments?segment=${dim}`}
              className={
                active
                  ? "px-3 py-1.5 rounded-md bg-zinc-800 text-white border border-zinc-700"
                  : "px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 border border-transparent"
              }
            >
              {SEGMENT_LABELS[dim]}
            </Link>
          );
        })}
      </nav>

      {report.length === 0 && (
        <p className="text-sm text-zinc-500">활성 실험이 없습니다.</p>
      )}

      {report.map((exp) => {
        const segments = [...new Set(exp.variants.map((v) => v.segment))].sort();
        const variants = [...new Set(exp.variants.map((v) => v.variant))];

        return (
          <section
            key={exp.key}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                {exp.key}
              </h2>
              <ForceVariantPicker experimentKey={exp.key} variants={variants} />
            </div>

            {segments.map((seg) => {
              const segRows = exp.variants.filter((v) => v.segment === seg);
              const baseline = segRows[0];
              const winner = segRows
                .map((v) => ({ ...v, wilson: wilsonLower(v.conversions, v.impressions) }))
                .reduce(
                  (best, v) => (v.wilson > best.wilson ? v : best),
                  { variant: "", segment: seg, impressions: 0, conversions: 0, wilson: 0 }
                );
              const totalImp = segRows.reduce((s, v) => s + v.impressions, 0);
              const hasSignal = totalImp >= 100;

              return (
                <div key={seg} className="mt-4 first:mt-0">
                  {segment !== "overall" && (
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                      segment: <span className="text-zinc-300">{seg}</span>
                      <span className="ml-2 text-zinc-600 tabular-nums">
                        {totalImp.toLocaleString()} imp.
                      </span>
                    </p>
                  )}

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                        <th className="text-left py-2">Variant</th>
                        <th className="text-right py-2 w-24">Imp.</th>
                        <th className="text-right py-2 w-24">Conv.</th>
                        <th className="text-right py-2 w-24">CR</th>
                        <th className="text-right py-2 w-24">Wilson</th>
                        <th className="text-right py-2 w-24">Lift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segRows.map((v) => {
                        const isWinner = hasSignal && v.variant === winner.variant && totalImp > 0;
                        return (
                          <tr
                            key={`${v.variant}-${v.segment}`}
                            className="border-b border-zinc-800 last:border-0"
                          >
                            <td className="py-2.5 font-medium">
                              <span className={isWinner ? "text-emerald-400" : "text-zinc-200"}>
                                {v.variant}
                                {isWinner && (
                                  <span className="ml-2 text-[10px] text-emerald-500">▲ leader</span>
                                )}
                                {baseline && v.variant === baseline.variant && (
                                  <span className="ml-2 text-[10px] text-zinc-600">baseline</span>
                                )}
                              </span>
                            </td>
                            <td className="text-right tabular-nums text-zinc-300">
                              {v.impressions.toLocaleString()}
                            </td>
                            <td className="text-right tabular-nums text-zinc-300">
                              {v.conversions.toLocaleString()}
                            </td>
                            <td className="text-right tabular-nums text-zinc-100">
                              {rateString(v.conversions, v.impressions)}
                            </td>
                            <td className="text-right tabular-nums text-zinc-500">
                              {v.impressions > 0
                                ? `${(wilsonLower(v.conversions, v.impressions) * 100).toFixed(2)}%`
                                : "—"}
                            </td>
                            <td className="text-right tabular-nums">
                              <span
                                className={
                                  baseline && v.variant === baseline.variant
                                    ? "text-zinc-600"
                                    : "text-zinc-300"
                                }
                              >
                                {baseline && v.variant === baseline.variant
                                  ? "—"
                                  : baseline
                                  ? formatLift(relativeLift(v, baseline))
                                  : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!hasSignal && (
                    <p className="mt-2 text-xs text-zinc-500">
                      표본이 적습니다 (impressions &lt; 100).
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      <p className="text-xs text-zinc-600 leading-relaxed">
        Wilson 신뢰하한 = success rate 의 95% 신뢰구간 하단.
        Lift = baseline (각 segment 내 첫 변형) 대비 전환율 변화.
        Segmentation 은 마이그레이션 020 적용 후 신규 이벤트부터 분류됩니다 (이전 이벤트는 &quot;unknown&quot; 으로 표시).
      </p>
    </div>
  );
}
