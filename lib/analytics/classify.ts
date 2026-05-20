/**
 * Pure classifiers for the A/B segmentation dashboard. Live in their own
 * module so the experiments tracker (server-side) and any future client-side
 * surface can share — and so they're trivially unit-testable without
 * stubbing the cookie / request store.
 *
 * Visitor type:
 *   The viewer cookie value is `${random8}${Date.now().toString(36)}` (see
 *   proxy.ts). We parse the trailing base36 segment to recover the cookie's
 *   creation timestamp. Anything within `NEW_VISITOR_WINDOW_MS` of that
 *   timestamp is treated as a "new" visitor; the rest are "returning".
 *
 * Device:
 *   Cheap UA sniff. Not exhaustive — we only need three buckets for the
 *   dashboard. Tablet check must come before mobile because tablet
 *   user-agents often include "Android" plus "Tablet" markers; treating
 *   them as mobile collapses the distinction.
 */

export type DeviceClass = "mobile" | "tablet" | "desktop" | "unknown";
export type VisitorType = "new" | "returning" | "unknown";

const NEW_VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h after first cookie
/** Don't accept timestamps before 2022 or in the (clock-skewed) future. */
const MIN_PLAUSIBLE_MS = Date.parse("2022-01-01T00:00:00Z");
const FUTURE_SKEW_MS = 60 * 1000;

export function parseViewerCreatedAt(cookie: string | undefined | null): number | null {
  if (!cookie || cookie.length <= 8) return null;
  const tsB36 = cookie.slice(8);
  // base36 digits only
  if (!/^[0-9a-z]+$/.test(tsB36)) return null;
  const ms = parseInt(tsB36, 36);
  if (!Number.isFinite(ms)) return null;
  if (ms < MIN_PLAUSIBLE_MS) return null;
  if (ms > Date.now() + FUTURE_SKEW_MS) return null;
  return ms;
}

export function classifyVisitor(
  cookie: string | undefined | null,
  now: number = Date.now()
): VisitorType {
  const createdAt = parseViewerCreatedAt(cookie);
  if (createdAt === null) return "unknown";
  return now - createdAt < NEW_VISITOR_WINDOW_MS ? "new" : "returning";
}

export function classifyDevice(ua: string | undefined | null): DeviceClass {
  if (!ua) return "unknown";
  // Tablet first — many tablets also match the mobile regex below.
  if (/iPad|Tablet|PlayBook|Kindle|Silk|Android(?!.*Mobile)/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|iPhone|iPod|Android|BlackBerry|Opera Mini|webOS/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export const _testing = { NEW_VISITOR_WINDOW_MS };
