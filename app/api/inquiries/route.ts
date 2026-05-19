import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";
import { inquiryCreateSchema } from "@/lib/api/schemas";
import { notifyInquiryWebhook } from "@/lib/webhooks";
import { notifyInquiryReceived } from "@/lib/email/notify";
import { canEmailClient } from "@/lib/preferences";

/**
 * Client-initiated inquiry creation. Replaces the previous browser-only
 * Supabase insert so we can fan out a Slack/Discord webhook and a
 * confirmation email server-side without exposing webhook URLs to the
 * browser.
 *
 * Validation + RLS guard:
 *  - Authed user only — `auth.getUser()` must return a row;
 *  - The insert hits the `projects` table under the user's RLS, so they
 *    can only create rows tied to their own client_id.
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

  const parsed = await parseBody(request, inquiryCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { model_id, title, brief, budget_range, purpose } = parsed.data;

  const composedBrief = [
    purpose ? `목적: ${purpose}` : null,
    budget_range ? `예산: ${budget_range}` : null,
    brief?.trim() || null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      client_id: user.id,
      model_id,
      title,
      brief: composedBrief || null,
      status: "inquiry",
    })
    .select("id, title")
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  // Fan-out side effects in the background — none of these gates the
  // response. We await with allSettled so a single failure doesn't take
  // down the others, but we still log to the response so the client can
  // see whether notifications fired (helpful in dev).
  const [model, client] = await Promise.all([
    supabase.from("models").select("name").eq("id", model_id).single(),
    supabase
      .from("clients")
      .select("name, email, company")
      .eq("id", user.id)
      .single(),
  ]);

  // Webhook always fires (admin-side awareness); the receipt email respects
  // the client's opt-out preference.
  const tasks: Promise<unknown>[] = [
    notifyInquiryWebhook({
      projectId: project.id,
      projectTitle: project.title,
      modelName: model.data?.name ?? null,
      clientCompany: client.data?.company ?? null,
      clientEmail: client.data?.email ?? user.email ?? null,
      briefExcerpt: composedBrief || null,
      budgetRange: budget_range ?? null,
    }),
  ];
  if (await canEmailClient(user.id, "inquiry_receipt")) {
    tasks.push(
      notifyInquiryReceived(client.data?.email ?? user.email ?? null, {
        clientName: client.data?.name ?? null,
        modelName: model.data?.name ?? "선택한 모델",
        projectTitle: project.title,
        brief: composedBrief || null,
        projectId: project.id,
      })
    );
  }
  const notifications = await Promise.allSettled(tasks);

  return NextResponse.json(
    {
      id: project.id,
      title: project.title,
      notifications: notifications.map((n) => n.status),
    },
    { status: 201 }
  );
}
