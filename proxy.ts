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

function assignExperimentCookies(request: NextRequest, response: NextResponse) {
  for (const def of Object.values(EXPERIMENTS)) {
    const name = cookieNameFor(def.key);
    const existing = request.cookies.get(name)?.value;
    if (resolveVariant(def, existing)) continue;
    const bucket = pickBucket(def);
    // Mirror to the request so the same request can read its own assignment.
    request.cookies.set(name, bucket);
    response.cookies.set(name, bucket, {
      maxAge: EXPERIMENT_COOKIE_MAX_AGE,
      httpOnly: false, // client-side analytics may want to read this
      sameSite: "lax",
      path: "/",
    });
  }

  // Issue a stable opaque viewer cookie so per-visitor PV dedup works from
  // the *first* request. The page-view tracker (`lib/analytics/track-view`)
  // reads it; if missing the tracker falls back to in-memory dedup only.
  if (!request.cookies.get(VIEW_COOKIE_NAME)?.value) {
    const value =
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    request.cookies.set(VIEW_COOKIE_NAME, value);
    response.cookies.set(VIEW_COOKIE_NAME, value, {
      maxAge: VIEW_COOKIE_MAX_AGE,
      httpOnly: true, // not needed on the client
      sameSite: "lax",
      path: "/",
    });
  }
}

export async function proxy(request: NextRequest) {
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

  // Protect admin routes
  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/login?next=/admin", request.url));
  }

  // Protect client routes
  if (pathname.startsWith("/client") && !user) {
    return NextResponse.redirect(
      new URL(`/login?next=${pathname}`, request.url)
    );
  }

  // Protect creator routes (external creators with owned models).
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
