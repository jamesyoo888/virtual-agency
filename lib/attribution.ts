/**
 * Marketing attribution snapshot. Captures the very first landing context
 * within a browser session and pins it until the next session opens — so a
 * visitor who lands via `?utm_source=instagram`, browses for a while, and
 * then submits an inquiry on the model detail page still gets the original
 * source recorded.
 *
 * Why sessionStorage and not localStorage:
 *   * scope matches "this visit" — we don't want yesterday's utm_source to
 *     follow a returning visitor who arrived directly today.
 *   * automatically expires when the browser tab closes.
 *
 * Why first-touch over last-touch:
 *   * paid ad attribution is the use case (which ad drove this lead). The
 *     last in-app navigation is irrelevant; the funnel-entry point is.
 */

export interface AttributionSnapshot {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

const KEY = "va_attribution";
const EMPTY: AttributionSnapshot = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  referrer: null,
};

function isInternalReferrer(ref: string, origin: string): boolean {
  if (!ref) return true;
  try {
    return new URL(ref).origin === origin;
  } catch {
    return false;
  }
}

/**
 * Idempotent — first call in a session sticks. Subsequent calls (e.g. when
 * the user navigates and AttributionSnapshotClient mounts again) become
 * no-ops, so re-landing inside the same session doesn't overwrite the
 * original source.
 */
export function snapshotAttribution(now: { search: string; referrer: string; origin: string } | null = null): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(KEY)) return;
    const ctx =
      now ?? {
        search: window.location.search,
        referrer: document.referrer,
        origin: window.location.origin,
      };
    const params = new URLSearchParams(ctx.search);
    const ref = isInternalReferrer(ctx.referrer, ctx.origin) ? null : ctx.referrer;
    const snap: AttributionSnapshot = {
      utm_source: params.get("utm_source")?.slice(0, 120) || null,
      utm_medium: params.get("utm_medium")?.slice(0, 120) || null,
      utm_campaign: params.get("utm_campaign")?.slice(0, 200) || null,
      referrer: ref?.slice(0, 500) || null,
    };
    if (Object.values(snap).some((v) => v !== null)) {
      sessionStorage.setItem(KEY, JSON.stringify(snap));
    }
  } catch {
    // sessionStorage can be blocked (privacy mode, CSP) — fall through.
  }
}

export function readAttribution(): AttributionSnapshot {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AttributionSnapshot>;
    return {
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      referrer: parsed.referrer ?? null,
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Test seam — clear the cached snapshot. */
export function _resetAttributionForTests(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}

export const ATTRIBUTION_STORAGE_KEY = KEY;
