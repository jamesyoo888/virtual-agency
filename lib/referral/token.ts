import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Referral codes — sign the referring client's id with HMAC so the platform
 * can verify a `/ref/<code>?t=<token>` URL was minted by us rather than
 * crafted by anyone who guessed a user id. No DB column required: the code
 * itself is the referring client_id, and verification is stateless.
 *
 * Why we sign rather than hash the user id:
 * - Hashing alone gives no recovery path; we'd need a reverse table to know
 *   *who* referred a visitor. Signing keeps the id readable to the platform
 *   while preventing third-party fabrication.
 * - Rotating REFERRAL_SECRET invalidates all outstanding links — useful if a
 *   spam wave erupts.
 */

const TOKEN_LENGTH = 12;

function getSecret(): string {
  return (
    process.env.REFERRAL_SECRET ||
    process.env.QUOTE_SHARE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-referral-secret"
  );
}

export function signReferralToken(code: string): string {
  return createHmac("sha256", getSecret())
    .update(`ref:${code}`)
    .digest("hex")
    .slice(0, TOKEN_LENGTH);
}

export function verifyReferralToken(code: string, token: string): boolean {
  if (!token || token.length !== TOKEN_LENGTH) return false;
  const expected = signReferralToken(code);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
