import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  STRIPE_ENABLED,
  verifyWebhookSignature,
  normalizeStripeStatus,
} from "@/lib/payment/stripe";

/**
 * Stripe webhook receiver. Handles two events:
 *   - checkout.session.completed: marks the project paid.
 *   - checkout.session.expired:   marks the session failed so the UI can
 *     prompt the user to retry.
 *
 * Security: every request is verified against STRIPE_WEBHOOK_SECRET via
 * HMAC-SHA256 with a 5-minute timestamp tolerance. Failures return 400 so
 * Stripe retries.
 *
 * Idempotency: we look up the project by stripe_session_id (mig 027) and
 * write the status. Duplicate deliveries are no-ops because the column
 * goes pending → succeeded once and stays there.
 */

// We cannot rely on JSON body parsing — signature verification needs the
// exact raw payload string.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  const verify = verifyWebhookSignature(rawBody, sig, secret);
  if (!verify.valid) {
    console.warn(`[stripe:webhook] signature rejected: ${verify.reason}`);
    return NextResponse.json(
      { error: `Invalid signature: ${verify.reason}` },
      { status: 400 }
    );
  }

  let event: {
    id: string;
    type: string;
    data: {
      object: {
        id: string;
        client_reference_id?: string | null;
        payment_status?: string | null;
        metadata?: { project_id?: string };
      };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle the two events we care about; ignore everything else with 200
  // so Stripe doesn't keep retrying.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object;
  const projectId =
    session.metadata?.project_id ?? session.client_reference_id ?? null;
  if (!projectId) {
    console.warn(
      `[stripe:webhook] event ${event.id} (${event.type}) missing project_id`
    );
    return NextResponse.json({ ok: true, ignored: "no_project_id" });
  }

  const status =
    event.type === "checkout.session.expired"
      ? "failed"
      : normalizeStripeStatus(session.payment_status);

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("projects")
    .update({
      stripe_session_id: session.id,
      stripe_payment_status: status,
    })
    .eq("id", projectId);

  if (error) {
    console.error(
      `[stripe:webhook] project ${projectId} update failed:`,
      error.message
    );
    // Return 500 so Stripe retries — the project may not exist yet
    // (race with project creation) and a retry should succeed.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.info(
    `[stripe:webhook] event ${event.id} (${event.type}) → project ${projectId} status=${status}`
  );
  return NextResponse.json({ ok: true, status });
}
