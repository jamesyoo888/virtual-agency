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
  /**
   * 7-day median response time in hours, computed from
   * project_status_history (first 'inquiry' → next-status transition).
   * Null when there are fewer than 3 responses to anchor on.
   */
  medianResponseHours: number | null;
}

export async function loadSocialProof(): Promise<SocialProof> {
  const empty: SocialProof = {
    deliveredCount: 0,
    activeModels: 0,
    averageRating: null,
    reviewCount: 0,
    medianResponseHours: null,
  };
  if (!SUPABASE_CONFIGURED) return empty;

  try {
    const supabase = await createClient();
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [delivered, models, reviews, recentProjects, recentHistory] = await Promise.all([
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
      supabase
        .from("projects")
        .select("id, created_at")
        .gte("created_at", since7d)
        .limit(2000),
      supabase
        .from("project_status_history")
        .select("project_id, from_status, changed_at")
        .eq("from_status", "inquiry")
        .gte("changed_at", since7d)
        .limit(2000),
    ]);

    const ratings = ((reviews.data ?? []) as { rating: number }[])
      .map((r) => r.rating)
      .filter((r) => Number.isFinite(r));

    const avg = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    // First-touch median: earliest 'inquiry → *' transition minus the
    // project's created_at, in hours.
    const createdByProject = new Map<string, number>();
    for (const p of (recentProjects.data ?? []) as {
      id: string;
      created_at: string;
    }[]) {
      const t = Date.parse(p.created_at);
      if (Number.isFinite(t)) createdByProject.set(p.id, t);
    }
    const firstMoveByProject = new Map<string, number>();
    for (const h of (recentHistory.data ?? []) as {
      project_id: string;
      changed_at: string;
    }[]) {
      const t = Date.parse(h.changed_at);
      if (!Number.isFinite(t)) continue;
      const prev = firstMoveByProject.get(h.project_id);
      if (prev == null || t < prev) firstMoveByProject.set(h.project_id, t);
    }
    const responseHours: number[] = [];
    for (const [pid, createdMs] of createdByProject) {
      const moveMs = firstMoveByProject.get(pid);
      if (moveMs == null) continue;
      const h = (moveMs - createdMs) / 3_600_000;
      if (h >= 0 && Number.isFinite(h)) responseHours.push(h);
    }
    responseHours.sort((a, b) => a - b);
    const medianResponseHours =
      responseHours.length >= 3
        ? Math.round(responseHours[Math.floor(responseHours.length / 2)] * 10) / 10
        : null;

    return {
      deliveredCount: delivered.count ?? 0,
      activeModels: models.count ?? 0,
      averageRating: avg,
      reviewCount: ratings.length,
      medianResponseHours,
    };
  } catch (err) {
    console.warn("[social-proof] load failed:", err);
    return empty;
  }
}
