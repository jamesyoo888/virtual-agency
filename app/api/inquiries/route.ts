import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";
import { inquiryCreateSchema } from "@/lib/api/schemas";
import { notifyInquiryWebhook } from "@/lib/webhooks";
import { notifyInquiryReceived, notifyReferralThanks } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/server";
import { canEmailClient } from "@/lib/preferences";
import { trackConversion } from "@/lib/experiments-track";
import { enforceRateLimit } from "@/lib/api/rate-limit";

function clientIpFrom(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "0.0.0.0";
}

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

  // Throttle authenticated abuse. Two cheap layers: per-user (catches
  // accidental double-submits + key-mashing) and per-IP (catches multiple
  // compromised accounts behind the same NAT/VPN). Note that serverless
  // instances each have their own counter, so the effective ceiling scales
  // with fanout — fine for incidental defense, not for hostile actors.
  const ip = clientIpFrom(request);
  const userDenied = enforceRateLimit({
    key: "inquiry:user",
    subject: user.id,
    limit: 5,
    windowMs: 60_000,
  });
  if (userDenied) return userDenied;
  const ipDenied = enforceRateLimit({
    key: "inquiry:ip",
    subject: ip,
    limit: 20,
    windowMs: 60_000,
  });
  if (ipDenied) return ipDenied;

  const parsed = await parseBody(request, inquiryCreateSchema);
  if (!parsed.ok) return parsed.response;

  const {
    model_id, title, brief, budget_range, purpose,
    utm_source, utm_medium, utm_campaign, referrer,
  } = parsed.data;

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
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      referrer: referrer || null,
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

  // Conversion event for the hero experiments. The visitor's bucket was
  // assigned by the proxy and is read inside trackConversion via cookies, so
  // we don't need to pass the variant explicitly. Fire-and-forget.
  void trackConversion("hero_cta", { surface: "inquiry_submit", userId: user.id });
  void trackConversion("hero_subtitle", { surface: "inquiry_submit", userId: user.id });

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

  // Referral attribution: when utm_source='referral', utm_campaign carries
  // the referring client's id (see lib/referral). Notify the referrer ONLY
  // on the referee's first-ever inquiry — repeat inquiries don't trigger a
  // new "first arrival" signal. We use the admin client because the referrer
  // is a *different* user and we still want to read their email row.
  if (utm_source === "referral" && utm_campaign && utm_campaign !== user.id) {
    try {
      const admin = await createAdminClient();
      const { count: priorCount } = await admin
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .neq("id", project.id);
      if ((priorCount ?? 0) === 0) {
        const { data: referrer } = await admin
          .from("clients")
          .select("id, email, name")
          .eq("id", utm_campaign)
          .maybeSingle();
        if (referrer?.email) {
          tasks.push(
            notifyReferralThanks(referrer.email, {
              clientName: referrer.name ?? null,
              refereeCompany: client.data?.company ?? null,
              referrerId: referrer.id,
            })
          );
        }
      }
    } catch (err) {
      console.warn("[inquiry] referral notify lookup failed", err);
    }
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
