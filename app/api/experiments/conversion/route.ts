import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { trackConversion } from "@/lib/experiments-track";
import { EXPERIMENTS } from "@/lib/experiments";

const experimentKeySchema = z.object({
  key: z.enum(Object.keys(EXPERIMENTS) as [string, ...string[]]),
  surface: z.string().max(64).optional(),
});

/**
 * Client-trigger conversion endpoint. Used by surfaces where the desired
 * action is an outbound navigation (e.g. clicking a similar-model card) and
 * therefore can't be tracked server-side from the form submit.
 *
 * Called via `navigator.sendBeacon` so the request survives page unload. The
 * beacon contract is fire-and-forget — we just need a 2xx so the browser
 * doesn't log a console error; the actual insert may still be in flight.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, experimentKeySchema);
  if (!parsed.ok) return parsed.response;

  // sendBeacon dispatches without cookies in some browsers when content-type
  // is non-default, but the JSON branch we use here does send cookies — that
  // is essential for trackConversion to read the bucket assignment.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await trackConversion(parsed.data.key as keyof typeof EXPERIMENTS, {
    surface: parsed.data.surface,
    userId: user?.id ?? null,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
