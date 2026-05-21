import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const postSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminWithId();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const parsed = await parseBody(request, postSchema);
  if (!parsed.ok) return parsed.response;

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createAdminClient();
  // `dev` is the placeholder userId used in non-Supabase environments; in
  // production the admin gate guarantees we have a real user.
  const author_id = gate.userId === "dev" ? null : gate.userId;

  const { data, error } = await supabase
    .from("project_notes")
    .insert({
      project_id: id,
      author_id,
      body: parsed.data.body.trim(),
    })
    .select()
    .single();

  if (error) {
    // Migration 025 unapplied is the most likely cause — surface a clear
    // hint so the operator knows what to fix.
    if (/relation .*project_notes.* does not exist/i.test(error.message)) {
      return NextResponse.json(
        { error: "project_notes 테이블 없음 — 마이그레이션 025 적용 필요" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const deleteSchema = z.object({
  noteId: z.string().uuid(),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminWithId();
  if (!denied.ok) return denied.response;

  // Both the path id and the query noteId narrow the row; the path id is
  // redundant given the noteId is a uuid, but checking both prevents an
  // admin from accidentally deleting a note from the wrong project page.
  const { id: projectId } = await params;
  const url = new URL(request.url);
  const noteId = url.searchParams.get("noteId");
  const parsed = deleteSchema.safeParse({ noteId });
  if (!parsed.success) {
    return NextResponse.json({ error: "noteId required" }, { status: 400 });
  }

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("project_notes")
    .delete()
    .eq("id", parsed.data.noteId)
    .eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
