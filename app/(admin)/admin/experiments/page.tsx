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

export const dynamic = "force-dynamic";
export const metadata = { title: "Experiments — Virtual Agency" };

interface VariantRow {
  variant: string;
  impressions: number;
  conversions: number;
}

interface ExperimentReport {
  key: string;
  variants: VariantRow[];
}

async function loadReport(): Promise<ExperimentReport[]> {
  if (!SUPABASE_CONFIGURED) {
    return Object.values(EXPERIMENTS).map((def) => ({
      key: def.key,
      variants: def.variants.map((v) => ({
        variant: v,
        impressions: 0,
        conversions: 0,
      })),
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiment_events")
    .select("key, variant, kind");
  if (error) {
    console.warn("[experiments] read failed:", error.message);
    return Object.values(EXPERIMENTS).map((def) => ({
      key: def.key,
      variants: def.variants.map((v) => ({
        variant: v,
        impressions: 0,
        conversions: 0,
      })),
    }));
  }

  // Aggregate in JS — `experiment_events` has a unique index per
  // (key, viewer_cookie, kind) so totals are already deduplicated.
  const map = new Map<string, Map<string, { impressions: number; conversions: number }>>();
  for (const def of Object.values(EXPERIMENTS)) {
    const inner = new Map<string, { impressions: number; conversions: number }>();
    for (const v of def.variants) inner.set(v, { impressions: 0, conversions: 0 });
    map.set(def.key, inner);
  }
  for (const row of (data ?? []) as { key: string; variant: string; kind: string }[]) {
    let inner = map.get(row.key);
    if (!inner) {
      inner = new Map();
      map.set(row.key, inner);
    }
    const entry = inner.get(row.variant) ?? { impressions: 0, conversions: 0 };
    if (row.kind === "impression") entry.impressions += 1;
    else if (row.kind === "conversion") entry.conversions += 1;
    inner.set(row.variant, entry);
  }

  return [...map.entries()].map(([key, inner]) => ({
    key,
    variants: [...inner.entries()].map(([variant, counts]) => ({
      variant,
      ...counts,
    })),
  }));
}

export default async function ExperimentsPage() {
  const report = await loadReport();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <FlaskConical className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold">Experiments</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            cookie 기반 A/B 버킷별 노출·전환. 신뢰 구간은 95% Wilson lower bound.
          </p>
        </div>
      </header>

      {report.length === 0 && (
        <p className="text-sm text-zinc-500">활성 실험이 없습니다.</p>
      )}

      {report.map((exp) => {
        const winner = exp.variants
          .map((v) => ({
            ...v,
            wilson: wilsonLower(v.conversions, v.impressions),
          }))
          .reduce(
            (best, v) => (v.wilson > best.wilson ? v : best),
            { variant: "", impressions: 0, conversions: 0, wilson: 0 }
          );
        const baseline = exp.variants[0];
        const totalImp = exp.variants.reduce((s, v) => s + v.impressions, 0);
        const hasSignal = totalImp >= 100; // arbitrary "enough to look at" threshold

        return (
          <section
            key={exp.key}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                {exp.key}
              </h2>
              <p className="text-xs text-zinc-500 tabular-nums">
                {totalImp.toLocaleString()} impressions
              </p>
            </div>

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
                {exp.variants.map((v) => {
                  const isWinner = hasSignal && v.variant === winner.variant && totalImp > 0;
                  return (
                    <tr key={v.variant} className="border-b border-zinc-800 last:border-0">
                      <td className="py-2.5 font-medium">
                        <span className={isWinner ? "text-emerald-400" : "text-zinc-200"}>
                          {v.variant}
                          {isWinner && <span className="ml-2 text-[10px] text-emerald-500">▲ leader</span>}
                          {v.variant === baseline.variant && (
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
                            v.variant === baseline.variant
                              ? "text-zinc-600"
                              : "text-zinc-300"
                          }
                        >
                          {v.variant === baseline.variant
                            ? "—"
                            : formatLift(relativeLift(v, baseline))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!hasSignal && (
              <p className="mt-3 text-xs text-zinc-500">
                표본이 적습니다 (impressions &lt; 100). 결정은 더 모은 뒤에.
              </p>
            )}
          </section>
        );
      })}

      <p className="text-xs text-zinc-600 leading-relaxed">
        Wilson 신뢰하한 = success rate 의 95% 신뢰구간 하단.
        Lift = baseline 대비 전환율 변화. 마이그레이션 012 미적용 시 모든 카운트가 0 으로 표시됩니다.
      </p>
    </div>
  );
}
