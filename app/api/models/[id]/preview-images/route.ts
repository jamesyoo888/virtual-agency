import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { isVideoUrl } from "@/lib/media/type";

// Public, read-only lookup of preview images for a model. Used by the
// catalog model-card hover carousel — kept lightweight so it can be called
// per-card on first hover without N+1 cost on the catalog query itself.
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SUPABASE_CONFIGURED) {
    const m = devModelStore.get(id);
    if (!m || m.status !== "active") {
      return NextResponse.json({ images: [] });
    }
    const dev = [
      ...(m.concept_image ? [m.concept_image] : []),
      ...(m.final_images ?? []),
    ];
    return NextResponse.json({ images: dev.slice(0, 6) });
  }

  const supabase = await createClient();
  const { data: model } = await supabase
    .from("models")
    .select("concept_image, status")
    .eq("id", id)
    .single();
  if (!model || model.status !== "active") {
    return NextResponse.json({ images: [] });
  }

  const { data: files } = await supabase
    .from("model_files")
    .select("url")
    .eq("model_id", id)
    .in("file_type", ["portfolio", "reference", "generated"])
    .order("created_at", { ascending: false })
    .limit(5);

  const images = [
    ...(model.concept_image ? [model.concept_image] : []),
    ...((files ?? []).map((f) => f.url).filter(Boolean) as string[]),
  ].filter((u) => !isVideoUrl(u));

  // Deduplicate while preserving order, cap at 6.
  const seen = new Set<string>();
  const unique = images.filter((u) => (seen.has(u) ? false : (seen.add(u), true))).slice(0, 6);

  return NextResponse.json({ images: unique });
}
