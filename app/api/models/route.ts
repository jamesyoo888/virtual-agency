import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { devModelStore, type DevModel } from "@/lib/dev-store";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { modelCreateSchema } from "@/lib/api/schemas";

export async function GET() {
  if (!SUPABASE_CONFIGURED) return NextResponse.json(devModelStore.list());

  const supabase = await createClient();
  const { data: models, error } = await supabase
    .from("models")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(models);
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parseResult = await parseBody(request, modelCreateSchema);
  if (!parseResult.ok) return parseResult.response;

  const {
    name, debut_date, bio, personality,
    industry_tags, genre_tags, mood_tags,
    instagram_handle, base_price, exclusive_price,
    is_exclusive_available, concept_image,
    base_rate, exclusive_rate, personality_tone,
    angle_images, final_images,
  } = parseResult.data;

  // Support both field name variants from the wizard
  const resolvedName = name;
  const resolvedBio = bio;
  const resolvedPersonality = personality ?? personality_tone;
  const resolvedBasePrice = base_price ?? base_rate;
  const resolvedExclusivePrice = exclusive_price ?? exclusive_rate;

  // Slug strips non-ASCII (Korean etc.); fall back to a stable prefix when empty.
  const slugBase =
    resolvedName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "model";
  const slug = `${slugBase}-${Date.now()}`;

  if (!SUPABASE_CONFIGURED) {
    const model: DevModel = {
      id: crypto.randomUUID(),
      name: resolvedName,
      slug,
      debut_date,
      bio: resolvedBio,
      personality: resolvedPersonality,
      industry_tags: industry_tags ?? [],
      genre_tags: genre_tags ?? [],
      mood_tags: mood_tags ?? [],
      instagram_handle,
      base_price: resolvedBasePrice,
      exclusive_price: resolvedExclusivePrice,
      is_exclusive_available: is_exclusive_available ?? true,
      concept_image,
      angle_images: angle_images ?? {},
      final_images: final_images ?? [],
      status: "draft",
      created_at: new Date().toISOString(),
    };
    devModelStore.add(model);
    return NextResponse.json(model, { status: 201 });
  }

  const adminSupabase = await createAdminClient();

  // Insert the model row
  const { data, error } = await adminSupabase
    .from("models")
    .insert({
      name: resolvedName,
      slug,
      debut_date,
      bio: resolvedBio,
      personality: resolvedPersonality,
      industry_tags: industry_tags ?? [],
      genre_tags: genre_tags ?? [],
      mood_tags: mood_tags ?? [],
      instagram_handle,
      base_price: resolvedBasePrice,
      exclusive_price: resolvedExclusivePrice,
      is_exclusive_available: is_exclusive_available ?? true,
      concept_image,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const modelId = data.id;

  // Insert model_files rows for angle images and final images
  const fileRows: { model_id: string; file_type: string; url: string; version: number }[] = [];

  if (concept_image) {
    fileRows.push({ model_id: modelId, file_type: "concept", url: concept_image, version: 1 });
  }

  if (angle_images && typeof angle_images === "object") {
    for (const [, url] of Object.entries(angle_images)) {
      if (url && typeof url === "string") {
        fileRows.push({ model_id: modelId, file_type: "reference", url, version: 1 });
      }
    }
  }

  if (Array.isArray(final_images)) {
    for (const url of final_images) {
      if (url && typeof url === "string") {
        fileRows.push({ model_id: modelId, file_type: "portfolio", url, version: 1 });
      }
    }
  }

  if (fileRows.length > 0) {
    const { error: fileError } = await adminSupabase
      .from("model_files")
      .insert(fileRows);
    if (fileError) {
      // Non-fatal: return model but include warning
      return NextResponse.json({ ...data, _warning: fileError.message }, { status: 201 });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
