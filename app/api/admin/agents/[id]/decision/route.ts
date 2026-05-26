import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";

const schema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

/**
 * Admin endpoint — approve or reject an agency application.
 *
 * Authorization: caller must satisfy isAdminClient(). The decision write
 * goes through the admin (service-role) client so RLS does not block it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .update({ agent_status: parsed.data.decision })
    .eq("id", id)
    .eq("role", "agent")
    .select("id, agent_status")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Agent not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, agent_status: data.agent_status });
}
