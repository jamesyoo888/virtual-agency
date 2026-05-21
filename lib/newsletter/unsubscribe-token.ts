import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-signed unsubscribe tokens for newsletter emails. Token binds the
 * recipient's email (lowercased) so a stolen URL can't unsubscribe a different
 * address. Token rotation = rotate NEWSLETTER_UNSUB_SECRET.
 *
 * Length: 24 hex chars (96 bits) — long enough to be unguessable, short
 * enough to fit comfortably in a footer link.
 */

const TOKEN_LENGTH = 24;

function getSecret(): string {
  return (
    process.env.NEWSLETTER_UNSUB_SECRET ||
    // Fall through to other server secrets so dev/preview work out of the box.
    process.env.QUOTE_SHARE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-newsletter-unsub-secret"
  );
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", getSecret())
    .update(`newsletter:unsub:${normalize(email)}`)
    .digest("hex")
    .slice(0, TOKEN_LENGTH);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!token || token.length !== TOKEN_LENGTH) return false;
  const expected = signUnsubscribeToken(email);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
