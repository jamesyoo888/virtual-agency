import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";

const bookmarkPayload = z.object({ model_id: z.string().uuid() });

async function requireAuthedClient() {
  if (!SUPABASE_CONFIGURED) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Supabase not configured" }, { status: 503 }),
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, supabase, userId: user.id };
}

export async function GET() {
  const auth = await requireAuthedClient();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase
    .from("model_bookmarks")
    .select("model_id, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    bookmarks: (data ?? []).map((b) => ({
      model_id: b.model_id,
      created_at: b.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthedClient();
  if (!auth.ok) return auth.response;
  const parsed = await parseBody(request, bookmarkPayload);
  if (!parsed.ok) return parsed.response;

  const { error } = await auth.supabase
    .from("model_bookmarks")
    .insert({ client_id: auth.userId, model_id: parsed.data.model_id });

  if (error) {
    // 23505 = unique violation → idempotent success
    if (error.code === "23505" || error.message.includes("duplicate")) {
      return NextResponse.json({ ok: true, idempotent: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthedClient();
  if (!auth.ok) return auth.response;
  const parsed = await parseBody(request, bookmarkPayload);
  if (!parsed.ok) return parsed.response;

  const { error } = await auth.supabase
    .from("model_bookmarks")
    .delete()
    .eq("client_id", auth.userId)
    .eq("model_id", parsed.data.model_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
