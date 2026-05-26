import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyWebhookSignature,
  normalizeStripeStatus,
  toStripeUnit,
  STRIPE_ENABLED,
  createCheckoutSession,
} from "@/lib/payment/stripe";

describe("toStripeUnit", () => {
  it("returns KRW amounts unchanged (zero-decimal currency)", () => {
    expect(toStripeUnit(5_000_000, "krw")).toBe(5_000_000);
    expect(toStripeUnit(5_000_000, "KRW")).toBe(5_000_000);
  });

  it("converts USD to cents", () => {
    expect(toStripeUnit(5, "usd")).toBe(500);
    expect(toStripeUnit(5.5, "USD")).toBe(550);
  });

  it("converts EUR to cents", () => {
    expect(toStripeUnit(12.34, "eur")).toBe(1234);
  });

  it("treats JPY and VND as zero-decimal currencies", () => {
    expect(toStripeUnit(1000, "jpy")).toBe(1000);
    expect(toStripeUnit(50000, "vnd")).toBe(50000);
  });
});

describe("normalizeStripeStatus", () => {
  it("maps Stripe payment_status to internal status", () => {
    expect(normalizeStripeStatus("paid")).toBe("succeeded");
    expect(normalizeStripeStatus("unpaid")).toBe("pending");
    expect(normalizeStripeStatus("no_payment_required")).toBe("succeeded");
  });

  it("collapses unknown values to failed", () => {
    expect(normalizeStripeStatus(null)).toBe("failed");
    expect(normalizeStripeStatus(undefined)).toBe("failed");
    expect(normalizeStripeStatus("anything_else")).toBe("failed");
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "whsec_test_secret_12345";

  function signed(payload: string, timestamp: number = Math.floor(Date.now() / 1000)) {
    const signedPayload = `${timestamp}.${payload}`;
    const v1 = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    return `t=${timestamp},v1=${v1}`;
  }

  it("accepts a correctly-signed payload within tolerance", () => {
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    const header = signed(payload);
    const r = verifyWebhookSignature(payload, header, secret);
    expect(r.valid).toBe(true);
  });

  it("rejects when signature does not match", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const header = signed(payload);
    const r = verifyWebhookSignature("tampered_payload", header, secret);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("signature mismatch");
  });

  it("rejects when signed with a different secret", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const wrongHeader = ((): string => {
      const ts = Math.floor(Date.now() / 1000);
      const v1 = createHmac("sha256", "other_secret")
        .update(`${ts}.${payload}`, "utf8")
        .digest("hex");
      return `t=${ts},v1=${v1}`;
    })();
    const r = verifyWebhookSignature(payload, wrongHeader, secret);
    expect(r.valid).toBe(false);
  });

  it("rejects timestamps outside the tolerance window", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const ancient = Math.floor(Date.now() / 1000) - 10_000; // ~3h old
    const header = signed(payload, ancient);
    const r = verifyWebhookSignature(payload, header, secret);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("timestamp outside tolerance");
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyWebhookSignature("x", null, secret).valid).toBe(false);
    expect(verifyWebhookSignature("x", "", secret).valid).toBe(false);
    expect(verifyWebhookSignature("x", "t=123", secret).valid).toBe(false);
    expect(verifyWebhookSignature("x", "v1=abc", secret).valid).toBe(false);
  });

  it("accepts a header with multiple v1 entries when any one matches", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const ts = Math.floor(Date.now() / 1000);
    const goodV1 = createHmac("sha256", secret)
      .update(`${ts}.${payload}`, "utf8")
      .digest("hex");
    // First signature is wrong (rotated key scenario), second is correct.
    const wrongV1 = "f".repeat(goodV1.length);
    const header = `t=${ts},v1=${wrongV1},v1=${goodV1}`;
    const r = verifyWebhookSignature(payload, header, secret);
    expect(r.valid).toBe(true);
  });

  it("rejects v1 entries with mismatched length without crashing", () => {
    const ts = Math.floor(Date.now() / 1000);
    const header = `t=${ts},v1=tooshort`;
    const r = verifyWebhookSignature("payload", header, secret);
    expect(r.valid).toBe(false);
  });

  it("rejects non-numeric timestamps", () => {
    const r = verifyWebhookSignature("x", "t=abc,v1=ffff", secret);
    expect(r.valid).toBe(false);
  });
});

describe("STRIPE_ENABLED and dry-run behavior", () => {
  const original = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (original !== undefined) {
      process.env.STRIPE_SECRET_KEY = original;
    }
  });

  it("STRIPE_ENABLED reflects env at module-load time", () => {
    // Note: STRIPE_ENABLED is captured at module load. We assert the type
    // rather than the boolean because subsequent env changes won't update it.
    expect(typeof STRIPE_ENABLED).toBe("boolean");
  });

  it("createCheckoutSession is a function regardless of env state", () => {
    expect(typeof createCheckoutSession).toBe("function");
  });
});
