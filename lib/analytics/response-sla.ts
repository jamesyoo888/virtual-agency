/**
 * Inquiry response SLA — how fast does the operator move a fresh inquiry past
 * 'inquiry' status? Pulled from project_status_history (migration 019). The
 * "response time" is from project creation to the first transition out of
 * 'inquiry'. Inquiries that never transitioned are excluded from the median /
 * p90 numerator but counted as `openCount` so the metric can't be gamed by
 * just letting inquiries rot.
 *
 * Pure scoring split into its own function so a test can drive it without
 * needing Supabase fixtures.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface ResponseInput {
  /** Created-at ms epoch. */
  createdAtMs: number;
  /** First out-of-'inquiry' transition ms epoch, or null if still open. */
  firstMoveAtMs: number | null;
}

export interface ResponseSlaReport {
  windowDays: number;
  totalInquiries: number;
  respondedCount: number;
  openCount: number;
  /** Open inquiries that have been waiting > 24h. Surfaces operational debt. */
  staleOpenCount: number;
  /** Median response time in hours. Null when nothing responded. */
  medianHours: number | null;
  /** 90th percentile response time in hours. Null when fewer than 5 responses. */
  p90Hours: number | null;
}

export function computeResponseSla(
  inputs: ResponseInput[],
  nowMs: number = Date.now(),
  windowDays: number = 30
): ResponseSlaReport {
  let respondedCount = 0;
  let openCount = 0;
  let staleOpenCount = 0;
  const responseHours: number[] = [];
  const STALE_MS = 24 * 60 * 60 * 1000;
  for (const i of inputs) {
    if (i.firstMoveAtMs != null) {
      respondedCount += 1;
      const ms = i.firstMoveAtMs - i.createdAtMs;
      if (ms >= 0 && Number.isFinite(ms)) {
        responseHours.push(ms / 3_600_000);
      }
    } else {
      openCount += 1;
      if (nowMs - i.createdAtMs > STALE_MS) staleOpenCount += 1;
    }
  }
  responseHours.sort((a, b) => a - b);
  return {
    windowDays,
    totalInquiries: inputs.length,
    respondedCount,
    openCount,
    staleOpenCount,
    medianHours: percentile(responseHours, 0.5),
    p90Hours: responseHours.length >= 5 ? percentile(responseHours, 0.9) : null,
  };
}

function percentile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  // Nearest-rank percentile keeps the math obvious; the dashboard is a
  // direction-of-travel signal, not a stats publication.
  const idx = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export async function loadResponseSla(
  windowDays: number = 30
): Promise<ResponseSlaReport> {
  const empty = computeResponseSla([], Date.now(), windowDays);
  if (!SUPABASE_CONFIGURED) return empty;
  const supabase = await createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const [{ data: projects }, { data: history }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, status, created_at")
      .eq("status", "inquiry")
      // Inquiries are kept until they transition — but we also want the
      // already-moved ones in the window. Pull a fresh set without status
      // filter, lower cost than two queries since the table is small.
      .gte("created_at", since)
      .limit(2000),
    supabase
      .from("project_status_history")
      .select("project_id, from_status, to_status, changed_at")
      .gte("changed_at", since)
      .neq("from_status", null)
      .limit(5000),
  ]);

  // Need *all* projects in the window for the denominator, not just the
  // still-open ones. Re-fetch without the status filter.
  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, created_at")
    .gte("created_at", since)
    .limit(2000);

  type ProjectRow = { id: string; created_at: string };
  type HistoryRow = {
    project_id: string;
    from_status: string | null;
    to_status: string;
    changed_at: string;
  };

  const projectRows = (allProjects as ProjectRow[] | null) ?? [];
  // Tolerate the unused query — if the filtered fetch matters elsewhere we
  // can use it; for now we just need the full denominator.
  void projects;

  const firstMoveByProject = new Map<string, number>();
  for (const h of (history as HistoryRow[] | null) ?? []) {
    if (h.from_status !== "inquiry") continue;
    const t = Date.parse(h.changed_at);
    if (!Number.isFinite(t)) continue;
    const prev = firstMoveByProject.get(h.project_id);
    if (prev == null || t < prev) firstMoveByProject.set(h.project_id, t);
  }

  const inputs: ResponseInput[] = projectRows.map((p) => {
    const created = Date.parse(p.created_at);
    return {
      createdAtMs: Number.isFinite(created) ? created : Date.now(),
      firstMoveAtMs: firstMoveByProject.get(p.id) ?? null,
    };
  });

  return computeResponseSla(inputs, Date.now(), windowDays);
}
