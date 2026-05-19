import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  DEFAULT_PREFERENCES,
  getClientPreferences,
  updateOwnPreferences,
} from "@/lib/preferences";

const preferencesPatchSchema = z.object({
  email_inquiry_receipt: z.boolean().optional(),
  email_status_changes: z.boolean().optional(),
  email_quote_ready: z.boolean().optional(),
  toast_status_changes: z.boolean().optional(),
});

export async function GET() {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(DEFAULT_PREFERENCES);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await getClientPreferences(user.id);
  return NextResponse.json(prefs);
}

export async function PATCH(request: Request) {
  const parsed = await parseBody(request, preferencesPatchSchema);
  if (!parsed.ok) return parsed.response;
  const result = await updateOwnPreferences(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Unauthorized" ? 401 : 500 }
    );
  }
  return NextResponse.json(result.data);
}
