import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { anonymize } from "@/lib/analytics/model-cases";

/**
 * Top approved reviews flattened for landing-page testimonial cards.
 * Reviewer company is anonymized at the server boundary — raw company
 * strings must never reach the client tree (see Wave 31 review policy).
 */
export interface Testimonial {
  id: string;
  rating: number;
  body: string;
  company: string;
  modelId: string | null;
  modelName: string | null;
  createdAt: string;
}

export async function loadTopTestimonials(limit = 3): Promise<Testimonial[]> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reviews")
      .select(
        "id, rating, body, created_at, client:clients(company), model:models(id, name)"
      )
      .eq("status", "approved")
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit * 3); // overshoot then filter for non-empty body

    type Row = {
      id: string;
      rating: number;
      body: string | null;
      created_at: string;
      client: { company: string | null } | null;
      model: { id: string | null; name: string | null } | null;
    };
    const rows = (data as unknown as Row[] | null) ?? [];
    return rows
      .filter((r) => r.body && r.body.trim().length > 0)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body!.trim(),
        company: anonymize(r.client?.company ?? null),
        modelId: r.model?.id ?? null,
        modelName: r.model?.name ?? null,
        createdAt: r.created_at,
      }));
  } catch (err) {
    console.warn("[testimonials] load failed:", err);
    return [];
  }
}
