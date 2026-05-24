/**
 * Pipeline velocity — how long it takes a fresh inquiry to land as `delivered`.
 * The response-SLA helper measures the first move out of `inquiry`, which
 * captures operator responsiveness; velocity here closes the loop on the full
 * lifecycle so we can spot the difference between "we replied fast but the
 * deal sat for weeks" vs "we replied slow but shipped immediately".
 *
 * Lead time = `delivered_at − created_at`. `delivered_at` comes from the most
 * recent `project_status_history` row with `to_status='delivered'` (mig 019),
 * which is authoritative — `projects.updated_at` is reset by any later edit
 * (notes, invoice change) and would inflate the measurement.
 *
 * Pure helper is the unit-tested surface; the loader is the thin Supabase
 * wrapper that materializes the row shape.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface VelocityRow {
  /** Project created_at (the inquiry-arrival timestamp) in ms epoch. */
  createdAtMs: number;
  /** First `to_status='delivered'` transition timestamp in ms epoch. */
  deliveredAtMs: number;
}

export interface VelocityMonthBucket {
  /** YYYY-MM (UTC) keyed off `deliveredAtMs`. */
  month: string;
  n: number;
  medianDays: number | null;
}

export interface VelocityReport {
  windowDays: number;
  /** Number of delivered projects in the window we could measure. */
  n: number;
  /** Median delivery lead time in whole days. Null when n=0. */
  medianDays: number | null;
  /** 90th-percentile lead time. Null when n<5 (too noisy to publish). */
  p90Days: number | null;
  /** Fastest measured lead time. Null when n=0. */
  fastestDays: number | null;
  /** Slowest measured lead time. Null when n=0. */
  slowestDays: number | null;
  /** Monthly slices, descending (most recent first). Empty months omitted. */
  byMonth: VelocityMonthBucket[];
}

export interface VelocityOptions {
  windowDays?: number;
  /** Reference "now" for tests. Defaults to Date.now(). */
  now?: number;
  /** Trailing months in the monthly slice. Default 6. */
  months?: number;
}

export function computePipelineVelocity(
  rows: VelocityRow[],
  opts: VelocityOptions = {}
): VelocityReport {
  const windowDays = opts.windowDays ?? 90;
  const now = opts.now ?? Date.now();
  const months = opts.months ?? 6;
  const since = now - windowDays * 86_400_000;

  const inWindow = rows.filter(
    (r) =>
      Number.isFinite(r.createdAtMs) &&
      Number.isFinite(r.deliveredAtMs) &&
      r.deliveredAtMs >= since &&
      r.deliveredAtMs >= r.createdAtMs
  );
  const days = inWindow
    .map((r) => (r.deliveredAtMs - r.createdAtMs) / 86_400_000)
    .sort((a, b) => a - b);

  const n = days.length;
  const medianDays = n > 0 ? roundDays(percentile(days, 0.5)) : null;
  const p90Days = n >= 5 ? roundDays(percentile(days, 0.9)) : null;
  const fastestDays = n > 0 ? roundDays(days[0]) : null;
  const slowestDays = n > 0 ? roundDays(days[n - 1]) : null;

  // Monthly slice keyed on the delivery month. We keep buckets present even
  // when n=0 so the UI can render a stable row sequence — but we trim back
  // to `months` most recent so the report is bounded.
  const monthKey = (ms: number): string => {
    const d = new Date(ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  };
  const byMonthMap = new Map<string, number[]>();
  for (const r of inWindow) {
    const key = monthKey(r.deliveredAtMs);
    const list = byMonthMap.get(key) ?? [];
    list.push((r.deliveredAtMs - r.createdAtMs) / 86_400_000);
    byMonthMap.set(key, list);
  }
  const byMonth: VelocityMonthBucket[] = [];
  const nowDate = new Date(now);
  for (let i = 0; i < months; i += 1) {
    const d = new Date(
      Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - i, 1)
    );
    const key = monthKey(d.getTime());
    const arr = (byMonthMap.get(key) ?? []).slice().sort((a, b) => a - b);
    byMonth.push({
      month: key,
      n: arr.length,
      medianDays: arr.length > 0 ? roundDays(percentile(arr, 0.5)) : null,
    });
  }

  return {
    windowDays,
    n,
    medianDays,
    p90Days,
    fastestDays,
    slowestDays,
    byMonth,
  };
}

function percentile(sortedAsc: number[], q: number): number {
  // Nearest-rank — keeps the math obvious; this is an operator dashboard, not
  // a stats publication.
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.ceil(q * sortedAsc.length) - 1
  );
  return sortedAsc[Math.max(0, idx)];
}

function roundDays(d: number): number {
  // Round to one decimal so sub-day differences are visible on the dashboard
  // (a same-day delivery reads 0.0d, a 6h cycle reads 0.3d).
  return Math.round(d * 10) / 10;
}

export async function loadPipelineVelocity(
  windowDays: number = 90
): Promise<VelocityReport> {
  const empty = computePipelineVelocity([], { windowDays });
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 86_400_000
  ).toISOString();

  // project_status_history.changed_at carries the authoritative delivery
  // moment. Join projects(created_at) to get the inquiry-arrival timestamp;
  // PostgREST returns the joined row as object-or-array depending on the
  // relationship cardinality, so accept both shapes.
  const { data, error } = await supabase
    .from("project_status_history")
    .select("project_id, changed_at, project:projects(created_at)")
    .eq("to_status", "delivered")
    .gte("changed_at", since)
    .limit(5000);
  if (error) return empty;

  type HistoryRow = {
    project_id: string;
    changed_at: string;
    project:
      | { created_at: string | null }
      | { created_at: string | null }[]
      | null;
  };
  // If a project somehow has multiple `to_status='delivered'` transitions
  // (status flip-flop, edge case), keep the earliest — that's the lead time
  // we actually delivered against the original inquiry.
  const firstDeliveredByProject = new Map<string, HistoryRow>();
  for (const h of (data as HistoryRow[] | null) ?? []) {
    const prev = firstDeliveredByProject.get(h.project_id);
    if (!prev || Date.parse(h.changed_at) < Date.parse(prev.changed_at)) {
      firstDeliveredByProject.set(h.project_id, h);
    }
  }

  const rows: VelocityRow[] = [];
  for (const h of firstDeliveredByProject.values()) {
    const p = Array.isArray(h.project) ? h.project[0] : h.project;
    const created = p?.created_at ? Date.parse(p.created_at) : NaN;
    const delivered = Date.parse(h.changed_at);
    if (!Number.isFinite(created) || !Number.isFinite(delivered)) continue;
    rows.push({ createdAtMs: created, deliveredAtMs: delivered });
  }
  return computePipelineVelocity(rows, { windowDays });
}
