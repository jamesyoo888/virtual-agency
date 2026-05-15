import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Usage tracking — paired with cap.ts to enforce cost limits.
 *
 * Persists to Supabase `usage_log` when configured, with an in-memory
 * fallback for dev so the cap logic can be exercised offline.
 */

export interface UsageEntry {
  route: string;
  model: string;
  cost_usd: number;
  user_id?: string | null;
  // Optional structured payload for debugging (e.g. duration, count). Stored
  // as JSONB but kept loose at the TypeScript boundary.
  metadata?: Record<string, unknown>;
  created_at: string; // ISO
}

// ── dev/in-memory store ──────────────────────────────────────────────────────
// Re-read on every access so callers can reset the store by reassigning the
// global (useful in tests; Next.js HMR also recreates the module).
function memStore(): UsageEntry[] {
  const g = global as typeof global & { __vaUsageLog?: UsageEntry[] };
  if (!g.__vaUsageLog) g.__vaUsageLog = [];
  return g.__vaUsageLog;
}

// ── windows ──────────────────────────────────────────────────────────────────
export type UsageWindow = "per_call" | "daily" | "weekly" | "monthly";

const WINDOW_MS: Record<Exclude<UsageWindow, "per_call">, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

// ── recording ────────────────────────────────────────────────────────────────
export async function recordUsage(entry: Omit<UsageEntry, "created_at">): Promise<void> {
  // Reject NaN/Infinity early so they never poison cap sums downstream.
  const cost_usd =
    Number.isFinite(entry.cost_usd) && entry.cost_usd >= 0 ? entry.cost_usd : 0;
  const created_at = new Date().toISOString();
  const full: UsageEntry = { ...entry, cost_usd, created_at };

  if (!SUPABASE_CONFIGURED) {
    memStore().push(full);
    return;
  }

  const supabase = await createAdminClient();
  const { error } = await supabase.from("usage_log").insert({
    route: full.route,
    model: full.model,
    cost_usd: full.cost_usd,
    user_id: full.user_id ?? null,
    metadata: full.metadata ?? null,
  });
  if (error) {
    // DB write failed but the paid generation already ran — keep an in-memory
    // shadow so the next cap check still counts this spend. Best-effort:
    // serverless cold start will lose it, but that's strictly better than
    // silently undercounting (could result in cap drift / runaway spend).
    memStore().push(full);
    console.error("[usage] insert failed; recorded in-memory fallback:", error.message);
  }
}

// ── querying ─────────────────────────────────────────────────────────────────
/**
 * Sum costs over a rolling window. `windowMs=0` totals everything.
 * Optional `userId` narrows the sum to a single admin — drives per-admin
 * sub-caps (a runaway admin can't burn through the global budget alone).
 */
export async function sumUsage(
  windowMs: number,
  userId?: string | null
): Promise<number> {
  if (!SUPABASE_CONFIGURED) {
    const cutoff = windowMs === 0 ? 0 : Date.now() - windowMs;
    return memStore()
      .filter((e) => new Date(e.created_at).getTime() >= cutoff)
      .filter((e) => (userId ? e.user_id === userId : true))
      .reduce((acc, e) => acc + (Number(e.cost_usd) || 0), 0);
  }

  const supabase = await createAdminClient();
  let query = supabase.from("usage_log").select("cost_usd");
  if (windowMs > 0) {
    const since = new Date(Date.now() - windowMs).toISOString();
    query = query.gte("created_at", since);
  }
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) {
    console.error("[usage] sum failed:", error.message);
    return 0;
  }
  return (data ?? []).reduce(
    (acc, row: { cost_usd: number | string | null }) =>
      acc + (Number(row.cost_usd) || 0),
    0
  );
}

/**
 * Convenience: get all three rolling windows at once for the admin UI.
 * Pass `userId` to scope to a single admin.
 */
export async function summarizeUsage(userId?: string | null): Promise<{
  daily: number;
  weekly: number;
  monthly: number;
}> {
  const [daily, weekly, monthly] = await Promise.all([
    sumUsage(WINDOW_MS.daily, userId),
    sumUsage(WINDOW_MS.weekly, userId),
    sumUsage(WINDOW_MS.monthly, userId),
  ]);
  return { daily, weekly, monthly };
}

/**
 * Per-admin spend over a rolling window. Used by /admin/usage to show which
 * admin is responsible for the current totals. Returns an empty array on
 * configuration miss rather than throwing.
 */
export async function spendByUser(windowMs: number): Promise<Array<{
  user_id: string;
  cost: number;
  count: number;
}>> {
  let entries: UsageEntry[] = [];
  if (!SUPABASE_CONFIGURED) {
    const cutoff = windowMs === 0 ? 0 : Date.now() - windowMs;
    entries = memStore().filter((e) => new Date(e.created_at).getTime() >= cutoff);
  } else {
    const supabase = await createAdminClient();
    let q = supabase.from("usage_log").select("user_id, cost_usd, created_at");
    if (windowMs > 0) {
      q = q.gte("created_at", new Date(Date.now() - windowMs).toISOString());
    }
    const { data, error } = await q;
    if (error) {
      console.error("[usage] spendByUser failed:", error.message);
      return [];
    }
    entries = (data as UsageEntry[]) ?? [];
  }

  const agg = new Map<string, { cost: number; count: number }>();
  for (const e of entries) {
    const id = e.user_id ?? "(unknown)";
    const prev = agg.get(id) ?? { cost: 0, count: 0 };
    prev.cost += Number(e.cost_usd) || 0;
    prev.count += 1;
    agg.set(id, prev);
  }
  return [...agg.entries()]
    .map(([user_id, v]) => ({ user_id, ...v }))
    .sort((a, b) => b.cost - a.cost);
}

/**
 * Most recent N usage entries — drives the admin /usage page.
 */
export async function recentUsage(limit = 50): Promise<UsageEntry[]> {
  if (!SUPABASE_CONFIGURED) {
    return [...memStore()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("usage_log")
    .select("route, model, cost_usd, user_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[usage] recent failed:", error.message);
    return [];
  }
  return (data as UsageEntry[]) ?? [];
}

export { WINDOW_MS };

// ── breakdowns ───────────────────────────────────────────────────────────────
/**
 * Per-route and per-model cost totals over a rolling window.
 * Drives the breakdown cards on /admin/usage.
 */
export async function breakdownUsage(windowMs: number): Promise<{
  byRoute: Array<{ route: string; cost: number; count: number }>;
  byModel: Array<{ model: string; cost: number; count: number }>;
}> {
  const since = windowMs === 0 ? 0 : Date.now() - windowMs;

  let entries: UsageEntry[] = [];
  if (!SUPABASE_CONFIGURED) {
    entries = memStore().filter((e) => new Date(e.created_at).getTime() >= since);
  } else {
    const supabase = await createAdminClient();
    let q = supabase.from("usage_log").select("route, model, cost_usd, created_at");
    if (windowMs > 0) q = q.gte("created_at", new Date(since).toISOString());
    const { data, error } = await q;
    if (error) {
      console.error("[usage] breakdown failed:", error.message);
      return { byRoute: [], byModel: [] };
    }
    entries = (data as UsageEntry[]) ?? [];
  }

  const routeAgg = new Map<string, { cost: number; count: number }>();
  const modelAgg = new Map<string, { cost: number; count: number }>();
  for (const e of entries) {
    const cost = Number(e.cost_usd) || 0;
    const r = routeAgg.get(e.route) ?? { cost: 0, count: 0 };
    r.cost += cost;
    r.count += 1;
    routeAgg.set(e.route, r);

    const m = modelAgg.get(e.model) ?? { cost: 0, count: 0 };
    m.cost += cost;
    m.count += 1;
    modelAgg.set(e.model, m);
  }

  const byCost = (a: { cost: number }, b: { cost: number }) => b.cost - a.cost;
  return {
    byRoute: [...routeAgg.entries()]
      .map(([route, v]) => ({ route, ...v }))
      .sort(byCost),
    byModel: [...modelAgg.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort(byCost),
  };
}

/**
 * Daily totals for the last N days, oldest first. Used for the sparkline.
 * Days are calendar days in the server's timezone (good enough for trend).
 */
export async function dailyHistory(
  days = 7
): Promise<Array<{ day: string; cost: number }>> {
  const now = new Date();
  const buckets: Array<{ day: string; cost: number; start: number; end: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const start = d.getTime();
    const end = start + 24 * 60 * 60 * 1000;
    buckets.push({
      day: d.toISOString().slice(0, 10),
      cost: 0,
      start,
      end,
    });
  }

  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  let entries: Pick<UsageEntry, "cost_usd" | "created_at">[] = [];
  if (!SUPABASE_CONFIGURED) {
    entries = memStore().filter((e) => new Date(e.created_at).getTime() >= since);
  } else {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("usage_log")
      .select("cost_usd, created_at")
      .gte("created_at", new Date(since).toISOString());
    if (error) {
      console.error("[usage] daily history failed:", error.message);
      return buckets.map(({ day, cost }) => ({ day, cost }));
    }
    entries = (data as UsageEntry[]) ?? [];
  }

  for (const e of entries) {
    const t = new Date(e.created_at).getTime();
    const bucket = buckets.find((b) => t >= b.start && t < b.end);
    if (bucket) bucket.cost += Number(e.cost_usd) || 0;
  }

  return buckets.map(({ day, cost }) => ({ day, cost }));
}
