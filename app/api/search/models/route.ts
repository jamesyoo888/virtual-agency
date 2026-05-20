import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/models?q=...
 *
 * Lightweight typeahead for the showcase search box. Public endpoint
 * (no auth) — only returns active models with non-sensitive fields.
 * Caps result count to 8 to keep the dropdown navigable.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 1) return NextResponse.json({ results: [] });

  if (!SUPABASE_CONFIGURED) {
    const needle = q.toLowerCase();
    const results = (devModelStore.list() as Model[])
      .filter((m) => {
        if (m.status !== "active") return false;
        const haystack = `${m.name ?? ""} ${m.bio ?? ""}`.toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        name: m.name,
        concept_image: m.concept_image ?? null,
        base_price: m.base_price ?? null,
      }));
    return NextResponse.json({ results });
  }

  const supabase = await createClient();
  // ilike with escaped wildcards so a `%` in the query can't blow up the LIKE.
  // Match name OR bio so the typeahead surface is consistent with the
  // main catalog search (lib/catalog/filter.ts).
  const safe = q.replace(/[%_]/g, "\\$&");
  const term = `%${safe}%`;
  const { data } = await supabase
    .from("models")
    .select("id, name, concept_image, base_price")
    .eq("status", "active")
    .or(`name.ilike.${term},bio.ilike.${term}`)
    .order("follower_count", { ascending: false })
    .limit(8);

  return NextResponse.json({ results: data ?? [] });
}
