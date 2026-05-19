import { createClient } from "@/lib/supabase/server";
import type { Model } from "@/types";

/**
 * Loads the data backing the /creator/dashboard page. A "creator" is any
 * authed user that owns at least one row in `models` (i.e. models.owner_id =
 * user.id). For the agency-owned model catalog, owner_id is NULL, so admins
 * see nothing here unless they also happen to own models — that's deliberate.
 *
 * The 30-day view count is folded in via `models_with_popularity` when the
 * view exists; we fall back to a single GROUP BY on model_views otherwise.
 * Inquiry counts come from `projects` filtered to the creator's models —
 * we never touch the project rows themselves, just their counts.
 */

export interface CreatorModelRow {
  model: Model;
  views30d: number;
  inquiries30d: number;
  deliveredAllTime: number;
}

export interface CreatorDashboardData {
  isCreator: boolean;
  rows: CreatorModelRow[];
  totals: {
    models: number;
    views30d: number;
    inquiries30d: number;
    deliveredAllTime: number;
  };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function loadCreatorDashboard(userId: string): Promise<CreatorDashboardData> {
  const supabase = await createClient();

  // Pull the creator's models. RLS gates this: only rows where owner_id =
  // userId are visible thanks to migration 013.
  const { data: ownModels } = await supabase
    .from("models")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const models = (ownModels as Model[] | null) ?? [];
  if (models.length === 0) {
    return {
      isCreator: false,
      rows: [],
      totals: { models: 0, views30d: 0, inquiries30d: 0, deliveredAllTime: 0 },
    };
  }

  const modelIds = models.map((m) => m.id);
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  // Aggregate views and inquiries in two scoped queries. We do the GROUP BY
  // in JS because PostgREST's `group=` is unwieldy and the counts here are
  // bounded by the number of models a creator owns (typically a handful).
  const [{ data: viewRows }, { data: projectRows }] = await Promise.all([
    supabase
      .from("model_views")
      .select("model_id, created_at")
      .in("model_id", modelIds)
      .gte("created_at", since),
    supabase
      .from("projects")
      .select("model_id, status, created_at")
      .in("model_id", modelIds),
  ]);

  const viewsByModel = new Map<string, number>();
  for (const row of (viewRows ?? []) as { model_id: string }[]) {
    viewsByModel.set(row.model_id, (viewsByModel.get(row.model_id) ?? 0) + 1);
  }

  const inquiriesByModel = new Map<string, number>();
  const deliveredByModel = new Map<string, number>();
  for (const row of (projectRows ?? []) as {
    model_id: string;
    status: string;
    created_at: string;
  }[]) {
    if (row.model_id == null) continue;
    if (new Date(row.created_at).getTime() >= Date.now() - THIRTY_DAYS_MS) {
      inquiriesByModel.set(row.model_id, (inquiriesByModel.get(row.model_id) ?? 0) + 1);
    }
    if (row.status === "delivered") {
      deliveredByModel.set(row.model_id, (deliveredByModel.get(row.model_id) ?? 0) + 1);
    }
  }

  const rows: CreatorModelRow[] = models.map((m) => ({
    model: m,
    views30d: viewsByModel.get(m.id) ?? 0,
    inquiries30d: inquiriesByModel.get(m.id) ?? 0,
    deliveredAllTime: deliveredByModel.get(m.id) ?? 0,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      models: acc.models + 1,
      views30d: acc.views30d + r.views30d,
      inquiries30d: acc.inquiries30d + r.inquiries30d,
      deliveredAllTime: acc.deliveredAllTime + r.deliveredAllTime,
    }),
    { models: 0, views30d: 0, inquiries30d: 0, deliveredAllTime: 0 }
  );

  return { isCreator: true, rows, totals };
}
