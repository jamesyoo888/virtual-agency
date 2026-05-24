/**
 * Per-stage dwell-time (bottleneck analysis). Drills into Wave 76 pipeline
 * velocity by breaking the total `inquiry → delivered` lead time down into
 * the four working stages, so the operator can see where deals actually
 * stall: response (inquiry→brief), discovery (brief→in_progress), production
 * (in_progress→review), or sign-off (review→delivered).
 *
 * Each measured project supplies one dwell sample per stage it traversed.
 * The terminal state (`delivered`) is never measured. Stages a project
 * skipped (e.g., admin moves inquiry → in_progress directly) silently
 * contribute no sample to the skipped stage.
 *
 * Pure helper carries the math; the loader is the thin Supabase wrapper.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/** Working stages we track — the terminal `delivered` is intentionally omitted. */
export const TIMED_STAGES = [
  "inquiry",
  "brief_received",
  "in_progress",
  "review",
] as const;

export type TimedStage = (typeof TIMED_STAGES)[number];

export interface StageProjectInput {
  projectId: string;
  /** projects.created_at in ms epoch — the moment the project entered `inquiry`. */
  createdAtMs: number;
  /**
   * Status transitions for this project, sorted ascending by changedAtMs.
   * `from_status` is unused — we infer the "previous" stage from the prior
   * transition (or `inquiry` for the very first move out of the initial state).
   */
  history: { toStatus: string; changedAtMs: number }[];
}

export interface StageBucket {
  stage: TimedStage;
  n: number;
  medianDays: number | null;
  p90Days: number | null;
  /**
   * Share of total measured lead time this stage accounts for (0..1). Computed
   * from the SUM of dwell across projects (not the median) so the operator can
   * see which stage owns the most aggregate calendar.
   */
  totalShare: number;
}

export interface StageTimingReport {
  windowDays: number;
  /** Number of projects that contributed at least one stage sample. */
  measuredProjects: number;
  buckets: StageBucket[];
  /**
   * Slowest stage by median dwell — null when no stage has data. Operators
   * use this as the headline pointer.
   */
  slowestStage: TimedStage | null;
}

export interface StageTimingOptions {
  windowDays?: number;
  now?: number;
}

export function computeStageTiming(
  projects: StageProjectInput[],
  opts: StageTimingOptions = {}
): StageTimingReport {
  const windowDays = opts.windowDays ?? 90;
  const now = opts.now ?? Date.now();
  const since = now - windowDays * 86_400_000;

  // Stage samples — one array per stage. We collect all dwell samples across
  // the qualifying projects and compute percentiles in a second pass.
  const samplesByStage: Record<TimedStage, number[]> = {
    inquiry: [],
    brief_received: [],
    in_progress: [],
    review: [],
  };
  const totalsByStage: Record<TimedStage, number> = {
    inquiry: 0,
    brief_received: 0,
    in_progress: 0,
    review: 0,
  };
  let measuredProjects = 0;

  for (const p of projects) {
    // Sort defensively — callers should provide ascending history, but make
    // the helper robust to either order so unit tests can be expressive.
    const history = p.history
      .slice()
      .sort((a, b) => a.changedAtMs - b.changedAtMs);
    const deliveredAt = history.find(
      (h) => h.toStatus === "delivered"
    )?.changedAtMs;
    if (deliveredAt === undefined) continue;
    if (deliveredAt < since) continue;

    let contributed = false;
    // The "previous" stage starts as `inquiry` (the initial state) and the
    // "previous entered" timestamp starts as the project creation moment.
    let prevStage: string = "inquiry";
    let prevEnteredMs = p.createdAtMs;

    for (const h of history) {
      const dwellMs = h.changedAtMs - prevEnteredMs;
      if (
        dwellMs >= 0 &&
        Number.isFinite(dwellMs) &&
        isTimedStage(prevStage)
      ) {
        samplesByStage[prevStage].push(dwellMs);
        totalsByStage[prevStage] += dwellMs;
        contributed = true;
      }
      // Advance the cursor. `delivered` will not advance to any further
      // transition (it's terminal), but the loop will still exit cleanly.
      prevStage = h.toStatus;
      prevEnteredMs = h.changedAtMs;
    }
    if (contributed) measuredProjects += 1;
  }

  const totalAllStages = TIMED_STAGES.reduce(
    (s, stage) => s + totalsByStage[stage],
    0
  );

  const buckets: StageBucket[] = TIMED_STAGES.map((stage) => {
    const sorted = samplesByStage[stage].slice().sort((a, b) => a - b);
    const n = sorted.length;
    return {
      stage,
      n,
      medianDays: n > 0 ? toDays(percentile(sorted, 0.5)) : null,
      p90Days: n >= 5 ? toDays(percentile(sorted, 0.9)) : null,
      totalShare:
        totalAllStages > 0 ? totalsByStage[stage] / totalAllStages : 0,
    };
  });

  // Slowest stage = the one with the highest median (tiebreak: higher n). We
  // intentionally use median over total because a stage that's slow for every
  // deal is a bigger operational problem than one rare 90-day outlier.
  let slowest: StageBucket | null = null;
  for (const b of buckets) {
    if (b.medianDays === null) continue;
    if (
      !slowest ||
      b.medianDays > (slowest.medianDays ?? -1) ||
      (b.medianDays === slowest.medianDays && b.n > slowest.n)
    ) {
      slowest = b;
    }
  }

  return {
    windowDays,
    measuredProjects,
    buckets,
    slowestStage: slowest?.stage ?? null,
  };
}

function isTimedStage(s: string): s is TimedStage {
  return (TIMED_STAGES as readonly string[]).includes(s);
}

function percentile(sortedAsc: number[], q: number): number {
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.ceil(q * sortedAsc.length) - 1
  );
  return sortedAsc[Math.max(0, idx)];
}

function toDays(ms: number): number {
  return Math.round((ms / 86_400_000) * 10) / 10;
}

export async function loadStageTiming(
  windowDays: number = 90
): Promise<StageTimingReport> {
  const empty = computeStageTiming([], { windowDays });
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 86_400_000
  ).toISOString();

  // Pull every `to_status='delivered'` transition in the window — the set of
  // project_ids it returns is the cohort we'll measure. The query is bounded
  // by changed_at so it stays cheap even with a long history.
  const { data: delivered, error: dErr } = await supabase
    .from("project_status_history")
    .select("project_id, changed_at")
    .eq("to_status", "delivered")
    .gte("changed_at", since)
    .limit(5000);
  if (dErr) return empty;

  const deliveredIds = Array.from(
    new Set(
      ((delivered as { project_id: string }[] | null) ?? []).map(
        (r) => r.project_id
      )
    )
  );
  if (deliveredIds.length === 0) return empty;

  // Now fetch the full history for each of those projects AND their
  // created_at. Two queries because PostgREST doesn't let us join from the
  // history table to projects with a where-in on the parent easily — and
  // batching gives us a single round-trip per table.
  const [{ data: history, error: hErr }, { data: projects, error: pErr }] =
    await Promise.all([
      supabase
        .from("project_status_history")
        .select("project_id, to_status, changed_at")
        .in("project_id", deliveredIds)
        .order("changed_at", { ascending: true })
        .limit(20_000),
      supabase
        .from("projects")
        .select("id, created_at")
        .in("id", deliveredIds)
        .limit(5000),
    ]);
  if (hErr || pErr) return empty;

  const createdByProject = new Map<string, number>();
  for (const p of (projects as { id: string; created_at: string }[] | null) ??
    []) {
    const t = Date.parse(p.created_at);
    if (Number.isFinite(t)) createdByProject.set(p.id, t);
  }

  const historyByProject = new Map<
    string,
    { toStatus: string; changedAtMs: number }[]
  >();
  for (const h of (history as
    | { project_id: string; to_status: string; changed_at: string }[]
    | null) ?? []) {
    const t = Date.parse(h.changed_at);
    if (!Number.isFinite(t)) continue;
    const list = historyByProject.get(h.project_id) ?? [];
    list.push({ toStatus: h.to_status, changedAtMs: t });
    historyByProject.set(h.project_id, list);
  }

  const inputs: StageProjectInput[] = [];
  for (const id of deliveredIds) {
    const createdAtMs = createdByProject.get(id);
    const hist = historyByProject.get(id);
    if (createdAtMs === undefined || !hist) continue;
    inputs.push({ projectId: id, createdAtMs, history: hist });
  }
  return computeStageTiming(inputs, { windowDays });
}
