import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  STRIPE_ENABLED,
  createCheckoutSession,
  toStripeUnit,
} from "@/lib/payment/stripe";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

/**
 * Open a Stripe Checkout Session for a quote and redirect the user to it.
 *
 * Authorization: caller must be the project's `client_id` (RLS check via the
 * SSR Supabase client). We never accept an authed admin override here —
 * Stripe Checkout requires the customer to be the one going through.
 *
 * Currency selection: clients.locale='en' → USD (rough 1300 KRW/USD), else
 * KRW (Korean clients pay in won). The locale signal is the same one used
 * by Wave 103 email dispatch. When migration 026 hasn't been applied we
 * default to KRW.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json(
      { error: "Stripe not configured (STRIPE_SECRET_KEY missing)" },
      { status: 503 }
    );
  }
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: project }, { data: client }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, title, invoice_amount, stripe_session_id, model:models(name, base_price)"
      )
      .eq("id", id)
      .eq("client_id", user.id)
      .single(),
    supabase
      .from("clients")
      .select("email, name, locale")
      .eq("id", user.id)
      .single(),
  ]);
  if (!project) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // Reuse an existing session id if Stripe gave us one in this window —
  // protects against accidental double-tap. The session lifetime is set by
  // Stripe (~24h); after that we'll create a new one.
  const existingSessionId = (project as { stripe_session_id?: string | null })
    .stripe_session_id;
  if (existingSessionId) {
    // We don't roundtrip Stripe to confirm the session is still usable — if
    // it's expired the visitor will see Stripe's error page and re-initiate.
    // Cheaper than an extra API call on every quote view.
    return NextResponse.json({ existing: true, sessionId: existingSessionId });
  }

  const model = (
    project as unknown as {
      model?: { name: string; base_price: number | null } | null;
    }
  ).model;
  const baseAmount =
    (project as { invoice_amount?: number | null }).invoice_amount ??
    model?.base_price ??
    0;
  if (baseAmount <= 0) {
    return NextResponse.json(
      { error: "Quote has no amount yet — contact your account manager" },
      { status: 409 }
    );
  }

  const locale = (client as { locale?: string | null } | null)?.locale;
  // EN-locale clients pay in USD. Rough KRW→USD conversion at 1300 — matches
  // the day-rate matching heuristic in /en/match.
  const currency = locale === "en" ? "usd" : "krw";
  const amountInPreferredCurrency =
    currency === "usd" ? Math.round(baseAmount / 1300) : baseAmount;
  const stripeUnit = toStripeUnit(amountInPreferredCurrency, currency);

  let session;
  try {
    session = await createCheckoutSession({
      projectId: project.id,
      customerEmail: client?.email ?? user.email ?? null,
      currency,
      amount: stripeUnit,
      description: `${model?.name ?? "Virtual Agency"} — ${project.title}`.slice(
        0,
        250
      ),
      successUrl: `${SITE_URL}/client/dashboard?paid=${project.id}`,
      cancelUrl: `${SITE_URL}/client/quote/${project.id}`,
    });
  } catch (err) {
    console.error("[stripe:checkout] create failed", err);
    return NextResponse.json(
      { error: "Stripe checkout failed; try again in a moment" },
      { status: 502 }
    );
  }

  if (!session.enabled) {
    return NextResponse.json(
      { error: "Stripe disabled at runtime" },
      { status: 503 }
    );
  }

  // Persist the session id so the webhook can reconcile + a re-open returns
  // the same session. Fire-and-forget; failure here is not user-facing.
  await supabase
    .from("projects")
    .update({
      stripe_session_id: session.id,
      stripe_payment_status: "pending",
    })
    .eq("id", project.id);

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
