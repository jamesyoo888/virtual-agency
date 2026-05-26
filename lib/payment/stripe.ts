/**
 * Minimal Stripe integration — direct HTTP rather than the `stripe` SDK.
 *
 * Why direct HTTP: we use exactly two endpoints (Checkout Session create +
 * webhook signature verification). Pulling in the full 500KB SDK for that
 * surface area is wasteful, and we can swap to it later if the surface
 * grows.
 *
 * Env contract:
 * - `STRIPE_SECRET_KEY`: server-side key. When missing, `STRIPE_ENABLED` is
 *   false and `createCheckoutSession()` returns `{ enabled: false }` so the
 *   caller can render a disabled state instead of erroring.
 * - `STRIPE_WEBHOOK_SECRET`: signing secret from the Stripe dashboard. The
 *   webhook route uses this to verify event authenticity.
 * - `NEXT_PUBLIC_SITE_URL`: where Stripe sends the visitor after checkout.
 *
 * The dry-run pattern matches the EmailProvider (lib/email/provider.ts) so
 * test/dev environments behave consistently across payment + email.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export const STRIPE_ENABLED =
  typeof process.env.STRIPE_SECRET_KEY === "string" &&
  process.env.STRIPE_SECRET_KEY.length > 0;

export interface CreateCheckoutInput {
  /** Stable identifier (project id) — used as Stripe client_reference_id. */
  projectId: string;
  /** Recipient email — improves Stripe's receipt and reduces card-input friction. */
  customerEmail?: string | null;
  /** Localized currency code, lower-case 3-letter (krw, usd, eur, sgd, gbp). */
  currency: string;
  /** Amount in the currency's smallest unit. KRW is zero-decimal so 5,000 = ₩5,000. USD with cents: 5000 = $50.00. */
  amount: number;
  /** Display name for the Checkout line item (e.g. "Yuna campaign — Spring 2026"). */
  description: string;
  /** Return URL on success — usually /client/dashboard. */
  successUrl: string;
  /** Return URL on cancel — usually /client/quote/[id]. */
  cancelUrl: string;
}

export interface CheckoutSessionDisabled {
  enabled: false;
}

export interface CheckoutSessionResult {
  enabled: true;
  id: string;
  url: string;
}

/**
 * Posts to `POST /v1/checkout/sessions` with form-urlencoded params (Stripe's
 * required content type for this endpoint).
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput
): Promise<CheckoutSessionResult | CheckoutSessionDisabled> {
  if (!STRIPE_ENABLED) {
    return { enabled: false };
  }
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("client_reference_id", input.projectId);
  if (input.customerEmail) params.set("customer_email", input.customerEmail);
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  // Single line item with the quote total. We embed the project id again in
  // metadata so the webhook is robust to absence of client_reference_id.
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", input.currency);
  params.set("line_items[0][price_data][unit_amount]", String(input.amount));
  params.set(
    "line_items[0][price_data][product_data][name]",
    input.description.slice(0, 250)
  );
  params.set("metadata[project_id]", input.projectId);

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Stripe checkout.create failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { id: string; url: string };
  return { enabled: true, id: json.id, url: json.url };
}

/**
 * Verify Stripe webhook signature header.
 *
 * Header format (`Stripe-Signature`):
 *   `t=<timestamp>,v1=<signature>[,v1=<other>]`
 *
 * Algorithm:
 *   signed_payload = `${timestamp}.${raw_body}`
 *   expected = HMAC-SHA256(secret, signed_payload)
 *   match expected against any v1 entry using timing-safe equality.
 *
 * `tolerance` defaults to 5 minutes — matches Stripe's recommended window.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  tolerance = 300
): { valid: boolean; reason?: string; timestamp?: number } {
  if (!signatureHeader) return { valid: false, reason: "missing header" };
  const parts = signatureHeader.split(",").map((p) => p.trim());
  const tsPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));
  if (!tsPart || v1Parts.length === 0) {
    return { valid: false, reason: "malformed header" };
  }
  const timestamp = Number(tsPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: "bad timestamp" };
  }
  const ageSec = Math.floor(Date.now() / 1000) - timestamp;
  if (Math.abs(ageSec) > tolerance) {
    return { valid: false, reason: "timestamp outside tolerance", timestamp };
  }
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  for (const v1 of v1Parts) {
    const provided = v1.slice(3);
    if (provided.length !== expected.length) continue;
    try {
      const ok = timingSafeEqual(
        Buffer.from(provided, "hex"),
        Buffer.from(expected, "hex")
      );
      if (ok) return { valid: true, timestamp };
    } catch {
      // length mismatch on the Buffer comparison — treat as miss.
    }
  }
  return { valid: false, reason: "signature mismatch", timestamp };
}

/**
 * Map Stripe checkout.session payment_status to our internal payment_status
 * column. We collapse Stripe's space to (pending|succeeded|failed) since
 * downstream UI only branches on those three.
 */
export function normalizeStripeStatus(
  paymentStatus: string | null | undefined
): "pending" | "succeeded" | "failed" {
  if (paymentStatus === "paid") return "succeeded";
  if (paymentStatus === "unpaid") return "pending";
  if (paymentStatus === "no_payment_required") return "succeeded";
  return "failed";
}

/**
 * Currencies whose smallest unit is the currency itself (no cents). Stripe
 * requires unit_amount in the smallest unit, so for KRW we pass the whole
 * number; for USD/EUR/SGD/GBP we pass cents.
 */
const ZERO_DECIMAL_CURRENCIES = new Set(["krw", "jpy", "vnd"]);

export function toStripeUnit(
  amount: number,
  currency: string
): number {
  const lower = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(lower)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}
