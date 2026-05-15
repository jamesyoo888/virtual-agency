import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { devModelStore } from "@/lib/dev-store";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { modelPatchSchema } from "@/lib/api/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const denied = await requireAdmin();
  if (denied) return denied;

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

  const denied = await requireAdmin();
  if (denied) return denied;

  const parseResult = await parseBody(req, modelPatchSchema);
  if (!parseResult.ok) return parseResult.response;

  const { final_images, angle_images, ...modelPatch } = parseResult.data;

  if (!SUPABASE_CONFIGURED) {
    const patch: Record<string, unknown> = { ...modelPatch };
    if (final_images !== undefined) patch.final_images = final_images;
    if (angle_images !== undefined) patch.angle_images = angle_images;
    devModelStore.update(id, patch);
    return NextResponse.json(devModelStore.get(id));
  }

  const supabase = await createAdminClient();

  let updatedModel: Record<string, unknown> | null = null;
  if (Object.keys(modelPatch).length > 0) {
    const { data, error } = await supabase
      .from("models")
      .update(modelPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updatedModel = data;
  } else {
    const { data } = await supabase.from("models").select("*").eq("id", id).single();
    updatedModel = data;
  }

  const fileRows: { model_id: string; file_type: string; url: string; version: number }[] = [];

  if (Array.isArray(final_images)) {
    for (const url of final_images) {
      if (url && typeof url === "string") {
        fileRows.push({ model_id: id, file_type: "portfolio", url, version: 1 });
      }
    }
  }

  if (angle_images && typeof angle_images === "object") {
    for (const [, url] of Object.entries(angle_images)) {
      if (url && typeof url === "string") {
        fileRows.push({ model_id: id, file_type: "reference", url, version: 1 });
      }
    }
  }

  if (fileRows.length > 0) {
    const { error: fileError } = await supabase
      .from("model_files")
      .insert(fileRows);
    if (fileError) {
      return NextResponse.json({ ...(updatedModel ?? {}), _warning: fileError.message });
    }
  }

  return NextResponse.json(updatedModel);
}
