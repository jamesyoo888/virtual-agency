/**
 * Revenue forecast — combines current pipeline value with the 90-day close
 * rate to project 30 days forward. Pure scoring split out for tests.
 *
 * The forecast is intentionally simple — three scenarios (conservative /
 * base / optimistic) derived from the same close rate but with different
 * confidence multipliers. This is a planning tool, not a fitted model;
 * the operator's job is to sanity-check, not trust blindly.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const ACTIVE_STATUSES = [
  "inquiry",
  "brief_received",
  "in_progress",
  "review",
] as const;

export interface PipelineRow {
  status: string;
  invoice_amount: number | null;
  created_at: string;
  model_id?: string | null;
  model_name?: string | null;
}

export interface PipelineByModel {
  model_id: string;
  model_name: string;
  count: number;
  value: number;
}

export interface PipelineAgeBucket {
  label: string;
  /** Inclusive lower bound in days since created_at. */
  minDays: number;
  /** Exclusive upper bound; `Infinity` for the open-ended last bucket. */
  maxDays: number;
  count: number;
  value: number;
}

/**
 * Day-based age buckets the forecast page and CSV both use. Edges are tuned
 * to surface "stuck" deals — anything past 30 days open is the operator's
 * follow-up backlog.
 */
export const PIPELINE_AGE_EDGES: { label: string; minDays: number; maxDays: number }[] = [
  { label: "≤7d", minDays: 0, maxDays: 8 },
  { label: "8-14d", minDays: 8, maxDays: 15 },
  { label: "15-30d", minDays: 15, maxDays: 31 },
  { label: "31d+", minDays: 31, maxDays: Infinity },
];

export function summarizePipelineAging(
  pipeline: PipelineRow[],
  now: Date = new Date()
): PipelineAgeBucket[] {
  const buckets: PipelineAgeBucket[] = PIPELINE_AGE_EDGES.map((e) => ({
    label: e.label,
    minDays: e.minDays,
    maxDays: e.maxDays,
    count: 0,
    value: 0,
  }));
  const nowMs = now.getTime();
  for (const p of pipeline) {
    const t = new Date(p.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    const ageDays = Math.max(0, (nowMs - t) / 86_400_000);
    const bucket = buckets.find(
      (b) => ageDays >= b.minDays && ageDays < b.maxDays
    );
    if (!bucket) continue;
    bucket.count += 1;
    bucket.value += p.invoice_amount ?? 0;
  }
  return buckets;
}

export type ForecastConfidence = "low" | "medium" | "high";

export interface ForecastReport {
  pipelineByStage: Record<string, { count: number; value: number }>;
  pipelineTotalValue: number;
  /** Top contributors to the open pipeline by invoice value. */
  pipelineByModel: PipelineByModel[];
  /** Open pipeline grouped by how long it's been sitting (since created_at). */
  pipelineAging: PipelineAgeBucket[];
  delivered90dCount: number;
  delivered90dValue: number;
  inquired90dCount: number;
  /** delivered / inquired over the 90-day reference window. */
  closeRate: number;
  /** Average invoice amount on delivered projects. */
  avgDealValue: number;
  /** 30-day revenue projections (3 scenarios). */
  scenarios: {
    conservative: number;
    base: number;
    optimistic: number;
  };
  /**
   * Sample-size confidence. <10 delivered → low (wide error bars), 10-30 →
   * medium, 30+ → high. Operator should treat low-confidence runs as
   * directional only.
   */
  confidence: ForecastConfidence;
  /** Inputs the operator may want to inspect. */
  windowDays: number;
}

export function computeConfidence(
  deliveredCount: number,
  inquiredCount: number
): ForecastConfidence {
  // Combined floor: any single number being tiny tanks confidence. We've seen
  // the close-rate metric swing wildly in the early data with <10 delivered.
  if (deliveredCount < 10 || inquiredCount < 30) return "low";
  if (deliveredCount < 30 || inquiredCount < 100) return "medium";
  return "high";
}

export function summarizePipelineByModel(
  pipeline: PipelineRow[],
  topN: number = 8
): PipelineByModel[] {
  // Group only on rows we can attribute (model_id present). Anonymous rows
  // still count toward the stage totals but skip this rollup — exposing a
  // "(unknown)" bucket here would mislead the operator about contribution.
  const acc = new Map<string, PipelineByModel>();
  for (const p of pipeline) {
    if (!p.model_id) continue;
    const key = p.model_id;
    const entry =
      acc.get(key) ??
      {
        model_id: key,
        model_name: p.model_name ?? "(이름 없음)",
        count: 0,
        value: 0,
      };
    entry.count += 1;
    entry.value += p.invoice_amount ?? 0;
    if (!acc.has(key)) acc.set(key, entry);
  }
  return Array.from(acc.values())
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, topN);
}

export function computeForecast(
  pipeline: PipelineRow[],
  delivered90d: PipelineRow[],
  inquired90d: PipelineRow[],
  windowDays: number = 30
): ForecastReport {
  const pipelineByStage: Record<string, { count: number; value: number }> = {};
  for (const s of ACTIVE_STATUSES) pipelineByStage[s] = { count: 0, value: 0 };
  let pipelineTotalValue = 0;
  for (const p of pipeline) {
    const bucket = pipelineByStage[p.status];
    if (!bucket) continue;
    bucket.count += 1;
    const v = p.invoice_amount ?? 0;
    bucket.value += v;
    pipelineTotalValue += v;
  }

  const delivered90dCount = delivered90d.length;
  const delivered90dValue = delivered90d.reduce(
    (s, p) => s + (p.invoice_amount ?? 0),
    0
  );
  const inquired90dCount = inquired90d.length;
  const closeRate =
    inquired90dCount > 0 ? delivered90dCount / inquired90dCount : 0;
  const avgDealValue =
    delivered90dCount > 0 ? delivered90dValue / delivered90dCount : 0;

  // Base scenario: 30-day rate = (90d revenue / 90 * 30). Pipeline value is
  // discounted by close rate. Conservative cuts both by 30%, optimistic
  // assumes pipeline closes faster (closeRate × 1.5, capped at 1).
  const runRate30d = (delivered90dValue / 90) * windowDays;
  const expectedPipelineRevenue = pipelineTotalValue * closeRate;
  const base = runRate30d + expectedPipelineRevenue;
  const conservative = base * 0.7;
  const optimisticRate = Math.min(1, closeRate * 1.5);
  const optimistic =
    runRate30d * 1.2 + pipelineTotalValue * optimisticRate;

  return {
    pipelineByStage,
    pipelineTotalValue,
    pipelineByModel: summarizePipelineByModel(pipeline),
    pipelineAging: summarizePipelineAging(pipeline),
    delivered90dCount,
    delivered90dValue,
    inquired90dCount,
    closeRate,
    avgDealValue,
    scenarios: {
      conservative: Math.round(conservative),
      base: Math.round(base),
      optimistic: Math.round(optimistic),
    },
    confidence: computeConfidence(delivered90dCount, inquired90dCount),
    windowDays,
  };
}

export async function loadForecast(): Promise<ForecastReport | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createAdminClient();
  const since90 = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [{ data: pipeline }, { data: delivered }, { data: inquired }] =
    await Promise.all([
      // Join models (left) to attribute pipeline value per model. Anonymous
      // pipeline rows (no model_id) still feed stage totals — they only drop
      // out of the per-model rollup.
      supabase
        .from("projects")
        .select(
          "status, invoice_amount, created_at, model_id, models:models(name)"
        )
        .in("status", ACTIVE_STATUSES as unknown as string[])
        .limit(2000),
      supabase
        .from("projects")
        .select("status, invoice_amount, created_at, updated_at")
        .eq("status", "delivered")
        .gte("updated_at", since90)
        .limit(2000),
      supabase
        .from("projects")
        .select("status, invoice_amount, created_at")
        .gte("created_at", since90)
        .limit(2000),
    ]);

  type JoinedRow = {
    status: string;
    invoice_amount: number | null;
    created_at: string;
    model_id: string | null;
    models: { name: string | null } | { name: string | null }[] | null;
  };
  const flatPipeline = ((pipeline as JoinedRow[] | null) ?? []).map((r) => {
    // PostgREST returns the foreign row as either an object or array
    // depending on the relationship cardinality — accept both.
    const m = Array.isArray(r.models) ? r.models[0] : r.models;
    return {
      status: r.status,
      invoice_amount: r.invoice_amount,
      created_at: r.created_at,
      model_id: r.model_id,
      model_name: m?.name ?? null,
    } satisfies PipelineRow;
  });

  return computeForecast(
    flatPipeline,
    (delivered as PipelineRow[] | null) ?? [],
    (inquired as PipelineRow[] | null) ?? []
  );
}
