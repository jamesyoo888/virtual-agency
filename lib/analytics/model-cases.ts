import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface ModelCase {
  id: string;
  title: string;
  delivered_at: string;
  company_anonymized: string;
  turnaround_days: number | null;
}

/**
 * Fetch up to `limit` delivered projects that used the given model. Used on
 * the model detail page as a social-proof block (anonymized client name).
 *
 * Failures are swallowed: the page must still render even when the projects
 * table is empty or unreachable.
 */
export async function fetchDeliveredCasesForModel(
  modelId: string,
  limit = 4
): Promise<ModelCase[]> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select(
        "id, title, created_at, updated_at, client:clients(company)"
      )
      .eq("model_id", modelId)
      .eq("status", "delivered")
      .order("updated_at", { ascending: false })
      .limit(limit);

    const rows =
      (data as unknown as Array<{
        id: string;
        title: string;
        created_at: string;
        updated_at: string;
        client?: { company: string | null } | null;
      }>) ?? [];

    return rows.map((row) => {
      const ms =
        new Date(row.updated_at).getTime() -
        new Date(row.created_at).getTime();
      const days =
        Number.isFinite(ms) && ms > 0
          ? Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
          : null;
      return {
        id: row.id,
        title: row.title,
        delivered_at: row.updated_at,
        company_anonymized: anonymize(row.client?.company),
        turnaround_days: days,
      };
    });
  } catch {
    return [];
  }
}

export function anonymize(company: string | null | undefined): string {
  if (!company) return "비공개 광고주";
  const trimmed = company.trim();
  if (trimmed.length <= 2) return `${trimmed[0] ?? "?"}*`;
  return `${trimmed[0]}${"*".repeat(Math.min(trimmed.length - 2, 6))}${trimmed.slice(-1)}`;
}
