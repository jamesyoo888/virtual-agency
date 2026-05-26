import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";

const schema = z.object({
  agent_company: z.string().trim().min(1).max(120),
  // Optional notes shown to the admin reviewer.
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Agency-partner signup endpoint. Idempotent — re-submitting reverts an
 * existing rejected application back to 'pending' (Wave 105 hybrid pattern:
 * open signup, admin approval, re-application allowed).
 *
 * Does NOT auto-approve. Even when the underlying clients row already has
 * role='admin', we still upsert role='agent' + agent_status='pending' so
 * the admin queue is the single source of truth for the agency tier.
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

  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  // Update existing row OR create one if the user has no clients row yet.
  // We avoid relying on a trigger because the auth-signup flow inserts the
  // clients row lazily.
  const { data: existing } = await supabase
    .from("clients")
    .select("id, role, agent_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("clients").insert({
      id: user.id,
      email: user.email ?? null,
      role: "agent",
      agent_status: "pending",
      agent_company: parsed.data.agent_company,
      agent_applied_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
  }

  // Refuse to overwrite a non-agent role unless the row is still a default
  // 'client'. Prevents an admin from accidentally demoting themselves by
  // re-applying.
  if (existing.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot apply as an agent" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("clients")
    .update({
      role: "agent",
      agent_status: "pending",
      agent_company: parsed.data.agent_company,
      agent_applied_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: "pending" });
}
