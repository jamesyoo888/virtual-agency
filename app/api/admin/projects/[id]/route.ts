import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { notifyStatusChanged } from "@/lib/email/notify";
import { canEmailClient } from "@/lib/preferences";

const STATUSES = [
  "inquiry",
  "brief_received",
  "in_progress",
  "review",
  "delivered",
] as const;

const projectPatchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  brief: z.string().nullish(),
  invoice_amount: z.number().int().nonnegative().nullish(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = await parseBody(request, projectPatchSchema);
  if (!parsed.ok) return parsed.response;

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createAdminClient();

  // Read prior state so we can detect a real status transition before sending
  // the notification (the PATCH is idempotent and the UI can fire repeat
  // requests with the same status).
  const { data: prior } = await supabase
    .from("projects")
    .select("status, title, client_id, model:models(name)")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("projects")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (parsed.data.status && prior && prior.status !== parsed.data.status) {
    const priorRecord = prior as unknown as {
      status: string;
      title: string;
      client_id: string;
      model?: { name?: string } | null;
    };

    const { data: client } = await supabase
      .from("clients")
      .select("email, name")
      .eq("id", priorRecord.client_id)
      .single();

    // Respect the client's notification opt-out before incurring the email
    // provider call. Defaults to allowed when no preference row exists.
    if (await canEmailClient(priorRecord.client_id, "status_changes")) {
      // Fire-and-await but never let an email failure roll back the status
      // change — `notifyStatusChanged` swallows + logs provider errors.
      await notifyStatusChanged(client?.email ?? null, {
        clientName: client?.name ?? null,
        modelName: priorRecord.model?.name ?? null,
        projectTitle: priorRecord.title,
        projectId: id,
        from: priorRecord.status,
        to: parsed.data.status,
      });
    }
  }

  return NextResponse.json(data);
}
