import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface ClientPreferences {
  email_inquiry_receipt: boolean;
  email_status_changes: boolean;
  email_quote_ready: boolean;
  email_weekly_digest: boolean;
  toast_status_changes: boolean;
}

export const DEFAULT_PREFERENCES: ClientPreferences = {
  email_inquiry_receipt: true,
  email_status_changes: true,
  email_quote_ready: true,
  email_weekly_digest: true,
  toast_status_changes: true,
};

export type EmailNotificationKind =
  | "inquiry_receipt"
  | "status_changes"
  | "quote_ready"
  | "weekly_digest";

const EMAIL_KIND_COLUMN: Record<EmailNotificationKind, keyof ClientPreferences> = {
  inquiry_receipt: "email_inquiry_receipt",
  status_changes: "email_status_changes",
  quote_ready: "email_quote_ready",
  weekly_digest: "email_weekly_digest",
};

/**
 * Fetches the client's preferences row, returning defaults if no row exists
 * (preferences are insert-on-first-edit, not seeded by trigger).
 * Uses the admin client because some callers (cross-user notifications)
 * don't sit under the client's auth context.
 */
export async function getClientPreferences(
  clientId: string
): Promise<ClientPreferences> {
  if (!SUPABASE_CONFIGURED) return DEFAULT_PREFERENCES;
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("client_preferences")
      .select(
        "email_inquiry_receipt, email_status_changes, email_quote_ready, email_weekly_digest, toast_status_changes"
      )
      .eq("client_id", clientId)
      .maybeSingle();
    if (!data) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(data as Partial<ClientPreferences>) };
  } catch (err) {
    console.warn("[preferences] fetch failed, using defaults:", err);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * One-shot helper for notification senders. Returns true if the client
 * has not explicitly disabled this email kind. Defaults to true.
 */
export async function canEmailClient(
  clientId: string,
  kind: EmailNotificationKind
): Promise<boolean> {
  const prefs = await getClientPreferences(clientId);
  const col = EMAIL_KIND_COLUMN[kind];
  return prefs[col] !== false;
}

/**
 * Upsert from the client's own session. Validates that the patch only
 * contains the boolean preference columns and routes through the user's
 * supabase client so RLS enforces ownership.
 */
export async function updateOwnPreferences(
  patch: Partial<ClientPreferences>
): Promise<{ ok: true; data: ClientPreferences } | { ok: false; error: string }> {
  if (!SUPABASE_CONFIGURED) {
    return { ok: false, error: "Supabase not configured" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const cleanPatch: Partial<ClientPreferences> = {};
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof ClientPreferences)[]) {
    if (typeof patch[key] === "boolean") {
      cleanPatch[key] = patch[key]!;
    }
  }

  const { data, error } = await supabase
    .from("client_preferences")
    .upsert({ client_id: user.id, ...cleanPatch }, { onConflict: "client_id" })
    .select(
      "email_inquiry_receipt, email_status_changes, email_quote_ready, email_weekly_digest, toast_status_changes"
    )
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: { ...DEFAULT_PREFERENCES, ...(data as Partial<ClientPreferences>) },
  };
}
