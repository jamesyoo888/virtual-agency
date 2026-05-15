import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Returns a NextResponse (401/403) if the caller is not an admin,
 * otherwise null. In dev mode (no Supabase) it bypasses the check.
 *
 * Use at the top of admin-only API routes:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("role")
    .eq("id", user.id)
    .single();

  if (client?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/**
 * Same admin gate, but returns the user_id when authorized — for routes that
 * want to attribute usage / rate-limit per-admin rather than globally.
 */
export async function requireAdminWithId(): Promise<
  { ok: false; response: NextResponse } | { ok: true; userId: string }
> {
  if (!SUPABASE_CONFIGURED) return { ok: true, userId: "dev" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("role")
    .eq("id", user.id)
    .single();

  if (client?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
