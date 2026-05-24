/**
 * Client retention analytics — pure helpers split out from any route so the
 * cohort math is fully unit-testable. Two distinct lenses live here:
 *
 *   1. `computeAtRiskClients` — operational re-engagement list. The "neglected"
 *      filter on /admin/clients already flags anyone-with-a-campaign who has
 *      been silent for 90 days, but that mixes one-shot leads with high-LTV
 *      regulars. This helper restricts to clients with **2+ delivered**
 *      projects (proven LTV) whose most recent activity is older than `silentDays`,
 *      and sorts the survivors by lifetime revenue desc so outreach burns the
 *      most valuable relationships first.
 *
 *   2. `computeCohortRetention` — cohort table. Groups clients by month of
 *      their FIRST delivery (this is the cleanest cohort anchor since a
 *      delivery is the moment a relationship becomes economic) and reports
 *      what share of that cohort had a second delivery within 60/90/180 days
 *      of the first. Surfaces whether the agency is genuinely repeat-driven or
 *      just churning new leads.
 *
 * Both helpers operate on the same minimal row shape so a single Supabase
 * fetch in the page can feed them both.
 */

export interface ClientRetentionProjectRow {
  client_id: string | null;
  invoice_amount: number | null;
  /** Delivery timestamp — typically projects.updated_at when status='delivered'. */
  delivered_at: string;
  client?: {
    company?: string | null;
    email?: string | null;
  } | null;
}

export interface AtRiskClient {
  id: string;
  company: string;
  email: string | null;
  deliveredCount: number;
  totalRevenue: number;
  lastDeliveredAt: string;
  /** Whole days since lastDeliveredAt at the moment of computation. */
  daysSilent: number;
}

export interface AtRiskOptions {
  /** Minimum delivered projects to count as proven LTV. Default 2. */
  minDelivered?: number;
  /** Silent-window threshold in days. Default 60. */
  silentDays?: number;
  /** Hard cap on the returned list. Default 20. */
  limit?: number;
  /** Reference "now" for tests. Defaults to Date.now(). */
  now?: number;
}

/**
 * Returns at-risk clients (proven LTV, gone quiet). Anonymous rows (no
 * client_id) are dropped — they cannot inform outreach. Aggregation keeps
 * the latest delivery timestamp per client; ties are broken by the row that
 * arrives last in the input array, which is fine since we only need the max.
 */
export function computeAtRiskClients(
  rows: ClientRetentionProjectRow[],
  opts: AtRiskOptions = {}
): AtRiskClient[] {
  const minDelivered = opts.minDelivered ?? 2;
  const silentDays = opts.silentDays ?? 60;
  const limit = opts.limit ?? 20;
  const now = opts.now ?? Date.now();
  const silentCutoff = now - silentDays * 86_400_000;

  type Agg = {
    id: string;
    company: string;
    email: string | null;
    deliveredCount: number;
    totalRevenue: number;
    lastDeliveredMs: number;
  };
  const byClient = new Map<string, Agg>();
  for (const r of rows) {
    if (!r.client_id) continue;
    const ts = new Date(r.delivered_at).getTime();
    if (!Number.isFinite(ts)) continue;
    const company =
      (r.client?.company ?? "").trim() ||
      r.client?.email ||
      "(미상)";
    const cur =
      byClient.get(r.client_id) ??
      ({
        id: r.client_id,
        company,
        email: r.client?.email ?? null,
        deliveredCount: 0,
        totalRevenue: 0,
        lastDeliveredMs: 0,
      } satisfies Agg);
    cur.deliveredCount += 1;
    cur.totalRevenue += r.invoice_amount ?? 0;
    if (ts > cur.lastDeliveredMs) cur.lastDeliveredMs = ts;
    byClient.set(r.client_id, cur);
  }

  const candidates: AtRiskClient[] = [];
  for (const a of byClient.values()) {
    if (a.deliveredCount < minDelivered) continue;
    if (a.lastDeliveredMs >= silentCutoff) continue;
    const daysSilent = Math.floor((now - a.lastDeliveredMs) / 86_400_000);
    candidates.push({
      id: a.id,
      company: a.company,
      email: a.email,
      deliveredCount: a.deliveredCount,
      totalRevenue: a.totalRevenue,
      lastDeliveredAt: new Date(a.lastDeliveredMs).toISOString(),
      daysSilent,
    });
  }
  // Most valuable at-risk relationships first; revenue ties broken by silence
  // (longer silence = more urgent).
  candidates.sort(
    (a, b) =>
      b.totalRevenue - a.totalRevenue ||
      b.daysSilent - a.daysSilent
  );
  return candidates.slice(0, limit);
}

export interface CohortBucket {
  /** YYYY-MM string in UTC. Anchors the cohort. */
  cohortMonth: string;
  size: number;
  repeat60d: number;
  repeat90d: number;
  repeat180d: number;
  /** Returned as 0..1 floats. null when size === 0 (cohort empty). */
  repeat60dRate: number | null;
  repeat90dRate: number | null;
  repeat180dRate: number | null;
}

export interface CohortOptions {
  /** How many trailing months of cohorts to include. Default 6. */
  months?: number;
  /** Reference "now" for tests. Defaults to Date.now(). */
  now?: number;
}

/**
 * Build a cohort-retention table. A client's cohort is the calendar month of
 * their first delivered project; we then ask "did they deliver a second
 * project within X days of the first?". 180-day buckets are not double-counted
 * with 90 — they're independent windows (60d ⊆ 90d ⊆ 180d), so a single repeat
 * delivery falls into every window whose threshold it crosses.
 *
 * Cohorts younger than the threshold are still included but rates will look
 * artificially low until the window matures; the caller should display a
 * "윈도우 미성숙" hint when `cohortMonth + threshold > now`.
 */
export function computeCohortRetention(
  rows: ClientRetentionProjectRow[],
  opts: CohortOptions = {}
): CohortBucket[] {
  const months = opts.months ?? 6;
  const now = opts.now ?? Date.now();

  // 1) For each client, collect delivery timestamps (ascending).
  const byClient = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.client_id) continue;
    const ts = new Date(r.delivered_at).getTime();
    if (!Number.isFinite(ts)) continue;
    const list = byClient.get(r.client_id) ?? [];
    list.push(ts);
    byClient.set(r.client_id, list);
  }
  for (const list of byClient.values()) list.sort((a, b) => a - b);

  // 2) Bucket clients by month of first delivery.
  const monthKey = (ms: number): string => {
    const d = new Date(ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  };

  const cohortMap = new Map<string, CohortBucket>();
  for (const list of byClient.values()) {
    if (list.length === 0) continue;
    const first = list[0];
    const key = monthKey(first);
    const bucket =
      cohortMap.get(key) ??
      ({
        cohortMonth: key,
        size: 0,
        repeat60d: 0,
        repeat90d: 0,
        repeat180d: 0,
        repeat60dRate: null,
        repeat90dRate: null,
        repeat180dRate: null,
      } satisfies CohortBucket);
    bucket.size += 1;
    // Did any later delivery fall within each window?
    const second = list[1];
    if (second !== undefined) {
      const gap = second - first;
      if (gap <= 60 * 86_400_000) bucket.repeat60d += 1;
      if (gap <= 90 * 86_400_000) bucket.repeat90d += 1;
      if (gap <= 180 * 86_400_000) bucket.repeat180d += 1;
    }
    cohortMap.set(key, bucket);
  }

  // 3) Materialize trailing N cohort months (descending: most recent first).
  // We list every month even when empty so the UI can render a stable row
  // sequence — an empty cohort with size 0 is meaningful ("we landed no new
  // clients in March").
  const result: CohortBucket[] = [];
  const nowDate = new Date(now);
  for (let i = 0; i < months; i += 1) {
    const d = new Date(
      Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - i, 1)
    );
    const key = monthKey(d.getTime());
    const bucket = cohortMap.get(key) ?? {
      cohortMonth: key,
      size: 0,
      repeat60d: 0,
      repeat90d: 0,
      repeat180d: 0,
      repeat60dRate: null,
      repeat90dRate: null,
      repeat180dRate: null,
    };
    if (bucket.size > 0) {
      bucket.repeat60dRate = bucket.repeat60d / bucket.size;
      bucket.repeat90dRate = bucket.repeat90d / bucket.size;
      bucket.repeat180dRate = bucket.repeat180d / bucket.size;
    }
    result.push(bucket);
  }
  return result;
}

/**
 * Helper for the UI: a cohort's window is "mature" once the threshold has
 * fully elapsed since the END of the cohort month. We use end-of-month to be
 * conservative — a client landed on the 30th has only had one day inside
 * "month + 0 days" by the 31st.
 */
export function cohortWindowMature(
  cohortMonth: string,
  windowDays: number,
  now: number = Date.now()
): boolean {
  // cohortMonth is "YYYY-MM" in UTC. The cohort closes at the end of that
  // month, so maturity = (end-of-month + windowDays) <= now.
  const [yStr, mStr] = cohortMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return false;
  // First day of NEXT month at 00:00 UTC = end-of-month boundary.
  const endOfMonth = Date.UTC(y, m, 1);
  return endOfMonth + windowDays * 86_400_000 <= now;
}
