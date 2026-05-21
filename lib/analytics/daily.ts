/**
 * Daily aggregation helpers for /admin/analytics. Pure for testability —
 * pass `rows` from the DB layer and `windowDays` to bucket. Always returns a
 * dense series (zeros for empty days) so the bar chart layout stays stable
 * regardless of activity.
 */
export interface DailyBucket {
  date: string; // YYYY-MM-DD (KST)
  count: number;
}

interface ProjectDateRow {
  created_at: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function ymdKst(ms: number): string {
  // Shift into KST so day buckets match what the operator expects on a
  // Korean-tz dashboard. Browsers running the chart aren't involved here —
  // this is server-rendered.
  const d = new Date(ms + KST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function aggregateDaily(
  rows: ProjectDateRow[],
  windowDays: number,
  nowMs: number = Date.now()
): DailyBucket[] {
  // Build the dense series first so zero-activity days still render.
  const dates: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    dates.push(ymdKst(nowMs - i * MS_PER_DAY));
  }
  const counts = new Map<string, number>(dates.map((d) => [d, 0]));
  for (const r of rows) {
    const t = Date.parse(r.created_at);
    if (!Number.isFinite(t)) continue;
    const key = ymdKst(t);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return dates.map((d) => ({ date: d, count: counts.get(d) ?? 0 }));
}
