import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  EXPERIMENTS,
  EXPERIMENT_COOKIE_MAX_AGE,
  cookieNameFor,
  pickBucket,
  resolveVariant,
} from "@/lib/experiments";
import { VIEW_COOKIE_NAME, VIEW_COOKIE_MAX_AGE } from "@/lib/analytics/track-view";

/**
 * Accept-Language redirect (folded in from the deprecated middleware.ts).
 *
 * Next.js 16 collapsed middleware + proxy into a single proxy.ts. The locale
 * redirect rules are unchanged from Wave 89: run only on the marketing tree,
 * honor an explicit cookie choice, exclude bot UAs, and only redirect when
 * English strictly outranks Korean in Accept-Language.
 */
const LOCALE_COOKIE = "va_locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

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
  "/press",
  "/legal/terms",
  "/legal/privacy",
  "/legal/ai-disclosure",
]);

const BOT_UA =
  /bot|crawler|spider|crawling|preview|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|whatsapp|telegrambot/i;

export function prefersEnglish(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
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
  return enQ > koQ;
}

/**
 * If the request is a first-visit marketing landing and Accept-Language
 * outranks ko, return a redirect to the matching /en/* path. Otherwise
 * return null to fall through to the rest of the proxy pipeline.
 */
function maybeLocaleRedirect(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;

  if (!MIRRORED_PATHS.has(pathname) && !pathname.startsWith("/blog/")) {
    return null;
  }

  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie === "ko" || cookie === "en") return null;

  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) return null;

  if (!prefersEnglish(req.headers.get("accept-language"))) return null;

  const target = (() => {
    if (pathname === "/") return "/en";
    if (pathname.startsWith("/blog/")) return "/en/blog";
    return `/en${pathname}`;
  })();

  const url = req.nextUrl.clone();
  url.pathname = target;

  const res = NextResponse.redirect(url, 307);
  res.cookies.set(LOCALE_COOKIE, "en", {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return res;
}

function assignExperimentCookies(request: NextRequest, response: NextResponse) {
  for (const def of Object.values(EXPERIMENTS)) {
    const name = cookieNameFor(def.key);
    const existing = request.cookies.get(name)?.value;
    if (resolveVariant(def, existing)) continue;
    const bucket = pickBucket(def);
    request.cookies.set(name, bucket);
    response.cookies.set(name, bucket, {
      maxAge: EXPERIMENT_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }

  if (!request.cookies.get(VIEW_COOKIE_NAME)?.value) {
    const value =
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    request.cookies.set(VIEW_COOKIE_NAME, value);
    response.cookies.set(VIEW_COOKIE_NAME, value, {
      maxAge: VIEW_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
}

export async function proxy(request: NextRequest) {
  // Locale redirect runs first — we don't want to spend a Supabase round-trip
  // on a request we're about to redirect anyway.
  const localeRedirect = maybeLocaleRedirect(request);
  if (localeRedirect) return localeRedirect;

  // Skip Supabase auth if env vars not configured yet (local dev without Supabase)
  if (!SUPABASE_CONFIGURED) {
    const res = NextResponse.next({ request });
    assignExperimentCookies(request, res);
    return res;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required for SSR auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/login?next=/admin", request.url));
  }
  if (pathname.startsWith("/client") && !user) {
    return NextResponse.redirect(
      new URL(`/login?next=${pathname}`, request.url)
    );
  }
  if (pathname.startsWith("/creator") && !user) {
    return NextResponse.redirect(
      new URL(`/login?next=${pathname}`, request.url)
    );
  }

  assignExperimentCookies(request, supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
