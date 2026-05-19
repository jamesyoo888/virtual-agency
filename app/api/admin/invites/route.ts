import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const createSchema = z.object({
  email_hint: z.string().email().optional().nullable(),
  ttl_days: z.number().int().positive().max(60).optional(),
});

export async function GET() {
  const gate = await requireAdminWithId();
  if (!gate.ok) return gate.response;
  if (!SUPABASE_CONFIGURED) return NextResponse.json([], { status: 200 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("id, token, email_hint, created_by, used_by, used_at, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const gate = await requireAdminWithId();
  if (!gate.ok) return gate.response;
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const parsed = await parseBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  // 24 base64url bytes = 192 bits of entropy, URL safe.
  const token = randomBytes(24).toString("base64url");

  const ttl = parsed.data.ttl_days ?? 14;
  const expires_at = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .insert({
      token,
      email_hint: parsed.data.email_hint ?? null,
      created_by: gate.userId,
      expires_at,
    })
    .select("id, token, email_hint, expires_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
