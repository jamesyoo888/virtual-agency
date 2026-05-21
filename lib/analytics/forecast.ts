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
}

export interface ForecastReport {
  pipelineByStage: Record<string, { count: number; value: number }>;
  pipelineTotalValue: number;
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
  /** Inputs the operator may want to inspect. */
  windowDays: number;
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
      supabase
        .from("projects")
        .select("status, invoice_amount, created_at")
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

  return computeForecast(
    (pipeline as PipelineRow[] | null) ?? [],
    (delivered as PipelineRow[] | null) ?? [],
    (inquired as PipelineRow[] | null) ?? []
  );
}
