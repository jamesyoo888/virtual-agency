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

  assignExperimentCookies(request, supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
