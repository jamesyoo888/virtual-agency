import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Build the per-client digest payload. One pass over projects + their
 * recent status (we don't have a status_history table yet; the digest
 * snapshot uses "updated in the last 7 days" as the change signal).
 *
 * Why we don't persist a status-change log: most clients have a handful of
 * active projects and the dashboard shows the source of truth anyway. When
 * the platform scales past that, a `project_events` table can power a
 * proper "what changed this week" diff — the digest renderer below accepts
 * a `recent` list so the upgrade is additive.
 */

const STATUS_KO: Record<string, string> = {
  inquiry: "문의 접수",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

export interface DigestProjectRow {
  id: string;
  title: string;
  status: string;
  status_ko: string;
  modelName: string | null;
  updatedAt: string;
  isRecent: boolean; // updated within the digest window
}

export interface DigestPayload {
  clientId: string;
  email: string | null;
  name: string | null;
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
  const [client, projects] = await Promise.all([
    supabase
      .from("clients")
      .select("id, email, name")
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

  const cutoff = Date.now() - DIGEST_WINDOW_MS;
  const rows: DigestProjectRow[] = (
    (projects.data as unknown as Array<{
      id: string;
      title: string;
      status: string;
      updated_at: string;
      model?: { name: string | null } | null;
    }>) ?? []
  ).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    status_ko: STATUS_KO[p.status] ?? p.status,
    modelName: p.model?.name ?? null,
    updatedAt: p.updated_at,
    isRecent: new Date(p.updated_at).getTime() >= cutoff,
  }));

  const active = rows.filter((r) => r.status !== "delivered");
  const deliveredRows = rows.filter((r) => r.status === "delivered");
  const recentChanges = rows.filter((r) => r.isRecent);

  return {
    clientId: client.data.id,
    email: client.data.email ?? null,
    name: client.data.name ?? null,
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
