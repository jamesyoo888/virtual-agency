import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Headline trust metrics for the public landing / catalog hero. Three
 * numbers that an advertiser can scan in 1.5 seconds:
 *
 *   deliveredCount — campaigns we actually shipped (status='delivered').
 *                    A real proof point, not a vanity metric.
 *   activeModels   — roster size; demonstrates breadth.
 *   averageRating  — across approved reviews; folded to one decimal.
 *
 * Each query is independent so a slow one can't block the others. When
 * Supabase isn't configured (local dev) we return zeros — the caller can
 * hide the strip entirely on the deliveredCount=0 case.
 */

export interface SocialProof {
  deliveredCount: number;
  activeModels: number;
  averageRating: number | null;
  reviewCount: number;
}

export async function loadSocialProof(): Promise<SocialProof> {
  const empty: SocialProof = {
    deliveredCount: 0,
    activeModels: 0,
    averageRating: null,
    reviewCount: 0,
  };
  if (!SUPABASE_CONFIGURED) return empty;

  try {
    const supabase = await createClient();
    const [delivered, models, reviews] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),
      supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      // Approved reviews only — pending / rejected don't count as social
      // proof yet. Pull `rating` rather than rely on a server-side AVG so
      // we don't need a dedicated RPC.
      supabase.from("reviews").select("rating").eq("status", "approved"),
    ]);

    const ratings = ((reviews.data ?? []) as { rating: number }[])
      .map((r) => r.rating)
      .filter((r) => Number.isFinite(r));

    const avg = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    return {
      deliveredCount: delivered.count ?? 0,
      activeModels: models.count ?? 0,
      averageRating: avg,
      reviewCount: ratings.length,
    };
  } catch (err) {
    console.warn("[social-proof] load failed:", err);
    return empty;
  }
}
