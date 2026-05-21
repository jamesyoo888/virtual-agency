import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { INDUSTRY_LABELS, MOOD_LABELS } from "@/lib/tags";

/**
 * Public JSON endpoint mirroring /trending — exposes the top-N active models
 * by 30-day view count so partner sites can embed a small "trending" widget
 * without scraping the HTML page. Read-only, anon-accessible, cached at the
 * edge for 5 minutes (data freshness > query cost matters here).
 */

export const runtime = "nodejs";
export const revalidate = 300;

const MAX_LIMIT = 24;
const DEFAULT_LIMIT = 8;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(MAX_LIMIT, limitParam)
      : DEFAULT_LIMIT;

  // Validate filter params against the known taxonomies — unknown values
  // would otherwise inject literals into the contains() filter and return
  // empty sets. Drop silently so partners get the default feed instead
  // of an error.
  const industryParam = url.searchParams.get("industry");
  const industry =
    industryParam && INDUSTRY_LABELS[industryParam] ? industryParam : null;
  const moodParam = url.searchParams.get("mood");
  const mood = moodParam && MOOD_LABELS[moodParam] ? moodParam : null;

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { items: [], note: "Supabase not configured in this environment" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("models_with_popularity")
      .select(
        "id, name, base_price, concept_image, industry_tags, mood_tags, view_count_30d"
      )
      .eq("status", "active")
      .order("view_count_30d", { ascending: false })
      .gt("view_count_30d", 0);
    if (industry) query = query.contains("industry_tags", [industry]);
    if (mood) query = query.contains("mood_tags", [mood]);
    const { data, error } = await query.limit(limit);
    if (error) throw error;

    type Row = {
      id: string;
      name: string;
      base_price: number | null;
      concept_image: string | null;
      industry_tags: string[] | null;
      mood_tags: string[] | null;
      view_count_30d: number;
    };
    const items = ((data ?? []) as Row[]).map((m) => ({
      id: m.id,
      name: m.name,
      base_price: m.base_price,
      image: m.concept_image,
      industry_tags: m.industry_tags ?? [],
      mood_tags: m.mood_tags ?? [],
      views_30d: m.view_count_30d,
      url: `${SITE_URL}/models/${m.id}`,
    }));
    return NextResponse.json(
      {
        items,
        count: items.length,
        filters: { industry, mood },
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          // Public + cdn-friendly. 5 minutes is short enough to feel live,
          // long enough to absorb hot-traffic without re-querying every hit.
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.warn("[api/trending] load failed:", err);
    return NextResponse.json(
      { items: [], error: "trending unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
