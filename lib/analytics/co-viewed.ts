import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import type { Model } from "@/types";

/**
 * Resolve a list of model IDs returned by `get_co_viewed_models` into full
 * Model rows in the order the RPC returned them (highest co-view count
 * first). Filters out inactive models — a model can have been viewed
 * heavily but archived since.
 */
export async function fetchCoViewedModels(
  targetModelId: string,
  limit = 6
): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) return [];

  try {
    const supabase = await createClient();

    const { data: pairs, error } = await supabase.rpc("get_co_viewed_models", {
      target_model_id: targetModelId,
      max_results: limit,
    });

    if (error || !pairs || pairs.length === 0) {
      // Function not present or no overlap yet — empty list, caller falls
      // back to tag-based similarity.
      return [];
    }

    const ids = (pairs as { model_id: string }[]).map((p) => p.model_id);
    const { data: models } = await supabase
      .from("models")
      .select(
        "id, name, slug, concept_image, base_price, is_exclusive_available, industry_tags, genre_tags, mood_tags, status, follower_count, debut_date, bio, personality, instagram_handle, exclusive_price, created_at, updated_at"
      )
      .in("id", ids)
      .eq("status", "active");

    if (!models) return [];

    // Preserve the co-view ranking — Supabase `.in()` doesn't guarantee
    // order, so we re-sort against the RPC's order.
    const order = new Map(ids.map((id, i) => [id, i] as const));
    return (models as Model[]).sort(
      (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)
    );
  } catch (err) {
    console.warn("[co-viewed] failed:", err);
    return [];
  }
}
