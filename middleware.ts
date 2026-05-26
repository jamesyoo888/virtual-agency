import { NextResponse, type NextRequest } from "next/server";

/**
 * Accept-Language redirect for first-time visitors.
 *
 * Strategy:
 *  1. Run only on the marketing root + a small set of public KR pages.
 *  2. If the visitor already has a `va_locale` cookie, honor it — no redirect.
 *  3. Otherwise, inspect Accept-Language. If en* outranks ko*, redirect to
 *     the matching /en/* page and set the cookie so subsequent visits do not
 *     re-evaluate.
 *  4. Bot/crawler user agents are excluded so canonical Korean pages still
 *     index for ko-targeted search.
 *
 * Anti-goals:
 *  - We never redirect inside /admin, /client, /creator, /login, /api, etc.
 *  - We never redirect away from /en/* — the visitor already chose.
 *  - We do not auto-redirect non-English locales (de, fr, ja, etc.). They land
 *    on the Korean homepage and can switch via the footer language toggle.
 */

const LOCALE_COOKIE = "va_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Marketing pages that have a /en/* counterpart we can redirect to. */
const MIRRORED_PATHS = new Set([
  "/",
  "/pricing",
  "/about",
  "/services",
  "/faq",
  "/cases",
  "/blog",
  "/match",
  "/rfp",
  "/legal/terms",
  "/legal/privacy",
  "/legal/ai-disclosure",
]);

/**
 * Hostname patterns common to crawlers. Keep the list small — false negatives
 * (a crawler we miss) are fine because they end up on the canonical Korean
 * page, which is also what Google and friends index.
 */
const BOT_UA = /bot|crawler|spider|crawling|preview|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|whatsapp|telegrambot/i;

export function prefersEnglish(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  // Parse Accept-Language into (tag, q-value) pairs. RFC 7231: tokens are
  // comma-separated and each token may carry a `;q=` weight defaulting to 1.0.
  const entries = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.split("=")[1] ?? "1") : 1;
      return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((e) => e.tag && e.q > 0);

  let enQ = 0;
  let koQ = 0;
  for (const { tag, q } of entries) {
    if (tag === "en" || tag.startsWith("en-")) {
      if (q > enQ) enQ = q;
    } else if (tag === "ko" || tag.startsWith("ko-")) {
      if (q > koQ) koQ = q;
    }
  }
  // Only redirect when English is *strictly* preferred over Korean. A tie
  // (e.g. `en-US,ko;q=0.9` vs `ko-KR,en;q=0.9`) defaults to staying on KO.
  return enQ > koQ;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The matcher already excludes most non-marketing paths, but be defensive
  // about the few that could slip through (e.g. extensions / dotfiles).
  if (!MIRRORED_PATHS.has(pathname) && !pathname.startsWith("/blog/")) {
    return NextResponse.next();
  }

  // Already chose a locale? Honor it.
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie === "ko" || cookie === "en") {
    return NextResponse.next();
  }

  // Bot? Stay on the canonical Korean page.
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) {
    return NextResponse.next();
  }

  // Accept-Language preference check.
  if (!prefersEnglish(req.headers.get("accept-language"))) {
    return NextResponse.next();
  }

  // Map the KO path to its /en/* counterpart. /blog/<slug> falls through to
  // /en/blog because the article may not exist in English — landing on the
  // English blog index is the safest no-op.
  const target = (() => {
    if (pathname === "/") return "/en";
    if (pathname.startsWith("/blog/")) return "/en/blog";
    return `/en${pathname}`;
  })();

  const url = req.nextUrl.clone();
  url.pathname = target;

  const res = NextResponse.redirect(url, 307);
  res.cookies.set(LOCALE_COOKIE, "en", {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return res;
}

export const config = {
  // Apply to the marketing tree only. Explicit exclusions for assets, API,
  // auth, and anything inside an authenticated surface.
  matcher: [
    "/((?!_next/|api/|admin/|client/|creator/|login|invite/|auth/|quote/|ref/|favicon\\.ico|robots\\.txt|sitemap.*\\.xml|news-sitemap\\.xml|.*\\..*).*)",
  ],
};
