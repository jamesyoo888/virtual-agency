/**
 * Week-over-week deltas for the admin home overview. Pure helper — the
 * caller hands in the date-stamped rows and we bucket into "this week"
 * (last 7 full days) and "previous week" (the 7 days before that).
 *
 * Why a fresh helper rather than reusing `aggregateDaily`: the daily
 * series is 30+ buckets, and folding it into two windows on the page
 * each render is wasteful. This computes both halves in one O(n) pass.
 */
export interface RevenueRow {
  created_at?: string;
  updated_at?: string;
  invoice_amount?: number | null;
}

export interface WowMetric {
  current: number;
  previous: number;
  /** absolute change (current - previous) */
  delta: number;
  /**
   * percent change. null when previous is 0 (avoid Infinity in UI; render
   * "신규" / "—" instead).
   */
  pct: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayUtcMs(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/**
 * @param rows date-keyed rows. `dateField` selects which timestamp to bucket on
 * @param weighted when true, sums `invoice_amount` instead of counting rows
 */
export function wowFromRows(
  rows: RevenueRow[],
  opts: {
    nowMs?: number;
    dateField?: "created_at" | "updated_at";
    weighted?: boolean;
  } = {}
): WowMetric {
  const now = opts.nowMs ?? Date.now();
  const dateField = opts.dateField ?? "created_at";
  const weighted = opts.weighted ?? false;
  const startToday = startOfDayUtcMs(now);
  // "Last 7 days" = (now-7d, now]. "Previous 7 days" = (now-14d, now-7d].
  const curStart = startToday - 6 * DAY_MS; // include today's partial bucket
  const prevStart = curStart - 7 * DAY_MS;
  const prevEnd = curStart;

  let current = 0;
  let previous = 0;
  for (const r of rows) {
    const raw = r[dateField];
    if (!raw) continue;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) continue;
    const v = weighted ? r.invoice_amount ?? 0 : 1;
    if (t >= curStart && t <= now) current += v;
    else if (t >= prevStart && t < prevEnd) previous += v;
  }

  const delta = current - previous;
  const pct = previous > 0 ? (delta / previous) * 100 : null;
  return { current, previous, delta, pct };
}
