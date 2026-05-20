import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Quote share tokens — sign a project id with HMAC so a holder can view the
 * quote without a Supabase session. There's no DB column for this: the token
 * is derived deterministically from (secret, projectId), so revocation is via
 * rotating QUOTE_SHARE_SECRET.
 *
 * The token is short (16 hex chars = 64 bits of HMAC) — enough entropy to be
 * unguessable for project ids that aren't otherwise leaked, while keeping
 * URLs compact.
 */

const TOKEN_LENGTH = 16;

function getSecret(): string {
  return (
    process.env.QUOTE_SHARE_SECRET ||
    // Fall back to other server-side secrets so dev/preview environments work
    // out of the box. In production an explicit QUOTE_SHARE_SECRET should be
    // set so rotating it invalidates outstanding share links.
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "dev-quote-share-secret"
  );
}

export function signQuoteToken(projectId: string): string {
  return createHmac("sha256", getSecret())
    .update(`quote:${projectId}`)
    .digest("hex")
    .slice(0, TOKEN_LENGTH);
}

export function verifyQuoteToken(projectId: string, token: string): boolean {
  if (!token || token.length !== TOKEN_LENGTH) return false;
  const expected = signQuoteToken(projectId);
  // Compare as buffers of equal length so timingSafeEqual doesn't throw.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
