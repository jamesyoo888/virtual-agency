/**
 * Actionable "stuck deal" list — the N currently-open projects whose current
 * stage entered-at is the oldest. Pairs with the stage-timing bottleneck
 * report (Wave 78) which tells you WHICH stage is slow; this tells you WHICH
 * specific deals are causing it. The operator clicks the row and lands on
 * /admin/projects/[id] to act.
 *
 * Scope is intentionally narrow:
 *   - Only `in_progress` and `review` qualify. `inquiry` has its own follow-up
 *     cron + stale chip on /admin/inbox; `brief_received` is too early to drag.
 *   - "Entered current stage" comes from the latest project_status_history row
 *     whose to_status matches the project's current status. Projects with no
 *     history (legacy data) fall back to projects.updated_at.
 *
 * Pure helper carries the math; the loader fans out two queries and joins
 * them in memory.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/** Open stages worth surfacing on this list. Inquiry/brief are excluded — see
 *  the module comment for why. */
export const SLOW_OPEN_STATUSES = ["in_progress", "review"] as const;
export type SlowOpenStatus = (typeof SLOW_OPEN_STATUSES)[number];

export interface SlowOpenProjectInput {
  id: string;
  title: string;
  status: SlowOpenStatus;
  modelName: string | null;
  invoiceAmount: number | null;
  /** projects.updated_at as a fallback when no history row matches. */
  updatedAtMs: number;
  /**
   * The most recent project_status_history.changed_at where to_status equals
   * this project's current status. null when no such row exists.
   */
  enteredCurrentStageAtMs: number | null;
}

export interface SlowOpenProject {
  id: string;
  title: string;
  status: SlowOpenStatus;
  modelName: string | null;
  invoiceAmount: number | null;
  /** Whole days since the project entered its current stage. */
  daysInStage: number;
  /** Whether we used the projects.updated_at fallback (no history row matched). */
  fallbackSource: "history" | "updated_at";
}

export interface SlowOpenOptions {
  limit?: number;
  now?: number;
}

export function computeSlowOpenProjects(
  inputs: SlowOpenProjectInput[],
  opts: SlowOpenOptions = {}
): SlowOpenProject[] {
  const limit = opts.limit ?? 5;
  const now = opts.now ?? Date.now();
  const rows: SlowOpenProject[] = [];
  for (const i of inputs) {
    const ts = i.enteredCurrentStageAtMs ?? i.updatedAtMs;
    if (!Number.isFinite(ts)) continue;
    const daysInStage = Math.max(0, Math.floor((now - ts) / 86_400_000));
    rows.push({
      id: i.id,
      title: i.title,
      status: i.status,
      modelName: i.modelName,
      invoiceAmount: i.invoiceAmount,
      daysInStage,
      fallbackSource:
        i.enteredCurrentStageAtMs !== null ? "history" : "updated_at",
    });
  }
  // Slowest first; tiebreak on invoice value desc so the most expensive
  // stuck deal floats up — that's the one worth chasing first.
  rows.sort(
    (a, b) =>
      b.daysInStage - a.daysInStage ||
      (b.invoiceAmount ?? 0) - (a.invoiceAmount ?? 0)
  );
  return rows.slice(0, limit);
}

export async function loadSlowOpenProjects(
  limit: number = 5
): Promise<SlowOpenProject[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createAdminClient();

  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select(
      "id, title, status, invoice_amount, updated_at, model:models(name)"
    )
    .in("status", SLOW_OPEN_STATUSES as unknown as string[])
    .limit(500);
  if (pErr || !projects || projects.length === 0) return [];

  type ProjectRow = {
    id: string;
    title: string;
    status: SlowOpenStatus;
    invoice_amount: number | null;
    updated_at: string;
    model: { name: string | null } | { name: string | null }[] | null;
  };
  const projectRows = projects as unknown as ProjectRow[];
  const ids = projectRows.map((p) => p.id);
  const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  // Pull the history rows for these projects in a single query, then find
  // the latest changed_at whose to_status matches the project's current
  // status. PostgREST gives us all rows; the per-project max happens in JS.
  const { data: history } = await supabase
    .from("project_status_history")
    .select("project_id, to_status, changed_at")
    .in("project_id", ids)
    .order("changed_at", { ascending: false })
    .limit(5000);

  type HistoryRow = {
    project_id: string;
    to_status: string;
    changed_at: string;
  };

  // Map: project_id → latest changed_at where to_status matches the project's
  // current status. Walk in descending order and take the first match per id.
  const enteredAt = new Map<string, number>();
  const statusById = new Map<string, string>(
    projectRows.map((p) => [p.id, p.status])
  );
  for (const h of (history as HistoryRow[] | null) ?? []) {
    if (enteredAt.has(h.project_id)) continue;
    if (h.to_status !== statusById.get(h.project_id)) continue;
    const t = Date.parse(h.changed_at);
    if (Number.isFinite(t)) enteredAt.set(h.project_id, t);
  }

  const inputs: SlowOpenProjectInput[] = projectRows.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    modelName: pickOne(p.model)?.name ?? null,
    invoiceAmount: p.invoice_amount,
    updatedAtMs: Date.parse(p.updated_at),
    enteredCurrentStageAtMs: enteredAt.get(p.id) ?? null,
  }));

  return computeSlowOpenProjects(inputs, { limit });
}
