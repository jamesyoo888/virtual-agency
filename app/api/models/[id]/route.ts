import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { devModelStore } from "@/lib/dev-store";

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SUPABASE_CONFIGURED) {
    const model = devModelStore.get(id);
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(model);
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("models")
    .select("*, model_files(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!SUPABASE_CONFIGURED) {
    devModelStore.update(id, body);
    return NextResponse.json(devModelStore.get(id));
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("models")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
