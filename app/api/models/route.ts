import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: models, error } = await supabase
    .from("models")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(models);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("role")
    .eq("id", user.id)
    .single();

  if (client?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, debut_date, bio, personality,
    industry_tags, genre_tags, mood_tags,
    instagram_handle, base_price, exclusive_price,
    is_exclusive_available, concept_image,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") + "-" + Date.now();

  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("models")
    .insert({
      name, slug, debut_date, bio, personality,
      industry_tags: industry_tags ?? [],
      genre_tags: genre_tags ?? [],
      mood_tags: mood_tags ?? [],
      instagram_handle,
      base_price,
      exclusive_price,
      is_exclusive_available: is_exclusive_available ?? true,
      concept_image,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
