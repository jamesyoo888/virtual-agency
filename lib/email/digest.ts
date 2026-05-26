import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Build the per-client digest payload. The "recent change" signal comes from
 * `project_status_history` (migration 019) — one row per real status
 * transition. When the table isn't available (e.g. migration not yet
 * applied) we transparently fall back to the older "updated in last 7d"
 * heuristic so the digest stays useful during rollouts.
 *
 * Why we prefer the dedicated table: `projects.updated_at` gets bumped by
 * every PATCH (brief edits, invoice tweaks). A client opening a weekly
 * digest cares about state transitions ("brief_received → in_progress"),
 * not arbitrary timestamp churn.
 */

const STATUS_KO: Record<string, string> = {
  inquiry: "문의 접수",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

const STATUS_EN: Record<string, string> = {
  inquiry: "Inquiry received",
  brief_received: "Brief received",
  in_progress: "In production",
  review: "Under review",
  delivered: "Delivered",
};

export interface DigestProjectRow {
  id: string;
  title: string;
  status: string;
  status_ko: string;
  status_en: string;
  modelName: string | null;
  updatedAt: string;
  isRecent: boolean; // updated within the digest window
}

export interface DigestPayload {
  clientId: string;
  email: string | null;
  name: string | null;
  /** Preferred locale for the digest email — driven by clients.locale (mig 026). */
  locale: "ko" | "en";
  active: DigestProjectRow[];
  recentChanges: DigestProjectRow[];
  deliveredCount: number;
}

const DIGEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_REMINDER_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000; // dedup retries

export async function buildDigestPayload(
  clientId: string
): Promise<DigestPayload | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const supabase = await createAdminClient();
  const cutoff = Date.now() - DIGEST_WINDOW_MS;
  const cutoffIso = new Date(cutoff).toISOString();

  // Fetch client metadata + their projects + the projects' status history
  // for the digest window. The history pull may fail (migration not yet
  // applied) — we tolerate that and fall back to updated_at as the signal.
  const [client, projects] = await Promise.all([
    // `locale` may not yet exist (migration 026 not applied); the helper
    // below tolerates that and defaults to "ko".
    supabase
      .from("clients")
      .select("id, email, name, locale")
      .eq("id", clientId)
      .single(),
    supabase
      .from("projects")
      .select("id, title, status, updated_at, model:models(name)")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  if (!client.data) return null;
  const clientLocale: "ko" | "en" =
    (client.data as { locale?: string | null }).locale === "en" ? "en" : "ko";

  const projectRows =
    (projects.data as unknown as Array<{
      id: string;
      title: string;
      status: string;
      updated_at: string;
      model?: { name: string | null } | null;
    }>) ?? [];
  const projectIds = projectRows.map((p) => p.id);

  // Only attempt the history join when there's at least one project — saves
  // an empty round-trip for brand-new accounts.
  let recentlyChangedIds = new Set<string>();
  let historyAvailable = false;
  if (projectIds.length > 0) {
    const { data: historyRows, error: historyErr } = await supabase
      .from("project_status_history")
      .select("project_id")
      .in("project_id", projectIds)
      .gte("changed_at", cutoffIso);
    if (!historyErr) {
      historyAvailable = true;
      recentlyChangedIds = new Set(
        ((historyRows ?? []) as { project_id: string }[]).map((r) => r.project_id)
      );
    }
    // historyErr (e.g. 42P01 relation does not exist) → silently fall back
    // to updated_at heuristic below.
  }

  const rows: DigestProjectRow[] = projectRows.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    status_ko: STATUS_KO[p.status] ?? p.status,
    status_en: STATUS_EN[p.status] ?? p.status,
    modelName: p.model?.name ?? null,
    updatedAt: p.updated_at,
    isRecent: historyAvailable
      ? recentlyChangedIds.has(p.id)
      : new Date(p.updated_at).getTime() >= cutoff,
  }));

  const active = rows.filter((r) => r.status !== "delivered");
  const deliveredRows = rows.filter((r) => r.status === "delivered");
  const recentChanges = rows.filter((r) => r.isRecent);

  return {
    clientId: client.data.id,
    email: client.data.email ?? null,
    name: client.data.name ?? null,
    locale: clientLocale,
    active,
    recentChanges,
    deliveredCount: deliveredRows.length,
  };
}

/**
 * Selects clients to include in this digest batch. Filters: digest opt-in =
 * true, no other send in the last `MIN_REMINDER_INTERVAL_MS`. Returns plain
 * UUIDs; the caller pairs them with `buildDigestPayload`.
 */
export async function selectDigestRecipients(now = Date.now()): Promise<string[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createAdminClient();
  const cutoff = new Date(now - MIN_REMINDER_INTERVAL_MS).toISOString();

  // Two pulls — prefs first, then clients without prefs (treated as opt-in
  // per DEFAULT_PREFERENCES). We deliberately don't upsert default rows to
  // avoid creating preference rows for accounts that never visited /client.
  const [{ data: optedIn }, { data: allClients }] = await Promise.all([
    supabase
      .from("client_preferences")
      .select("client_id, last_digest_sent_at")
      .eq("email_weekly_digest", true),
    supabase.from("clients").select("id, email"),
  ]);

  const prefsMap = new Map<string, string | null>();
  for (const row of (optedIn ?? []) as { client_id: string; last_digest_sent_at: string | null }[]) {
    prefsMap.set(row.client_id, row.last_digest_sent_at);
  }
  // Also account for clients with no preference row → defaults (opt-in).
  const explicitOut = new Set<string>();
  const { data: optedOut } = await supabase
    .from("client_preferences")
    .select("client_id")
    .eq("email_weekly_digest", false);
  for (const row of (optedOut ?? []) as { client_id: string }[]) {
    explicitOut.add(row.client_id);
  }

  const recipients: string[] = [];
  for (const c of ((allClients ?? []) as { id: string; email: string | null }[])) {
    if (!c.email) continue;
    if (explicitOut.has(c.id)) continue;
    const last = prefsMap.get(c.id);
    if (last && last >= cutoff) continue; // sent within the window
    recipients.push(c.id);
  }
  return recipients;
}

export async function markDigestSent(
  clientId: string,
  at: Date = new Date()
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const supabase = await createAdminClient();
  // Upsert — creates a prefs row at default values if the client never saved.
  await supabase
    .from("client_preferences")
    .upsert(
      { client_id: clientId, last_digest_sent_at: at.toISOString() },
      { onConflict: "client_id" }
    );
}
