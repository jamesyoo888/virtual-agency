import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";
import { reviewCreateSchema } from "@/lib/api/schemas";

/**
 * Client submits a review for one of their own projects. The handler:
 *   - validates the body shape with zod;
 *   - verifies the project belongs to the authed user and is `delivered`
 *     (review window opens only after delivery);
 *   - inserts the review with status='pending' for admin moderation.
 *
 * Duplicate submissions are caught by the table's unique constraint
 * `(project_id, client_id)` and surfaced as a 409.
 */
export async function POST(request: Request) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(request, reviewCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, client_id, model_id, status")
    .eq("id", parsed.data.project_id)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (project.status !== "delivered") {
    return NextResponse.json(
      { error: "Reviews open only after delivery" },
      { status: 409 }
    );
  }
  if (!project.model_id) {
    return NextResponse.json(
      { error: "Project has no model attached" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      project_id: project.id,
      model_id: project.model_id,
      client_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already reviewed" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
