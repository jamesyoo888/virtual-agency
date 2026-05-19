import { generateConceptImages } from "@/lib/replicate/client";
import { NextResponse } from "next/server";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { generateImageSchema } from "@/lib/api/schemas";
import { estimateImageCost } from "@/lib/cost/pricing";
import { enforceCaps } from "@/lib/cost/cap";
import { recordUsage } from "@/lib/cost/store";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { uploadGeneratedImages } from "@/lib/storage/upload";

export async function POST(request: Request) {
  const auth = await requireAdminWithId();
  if (!auth.ok) return auth.response;

  // 20 image-gen requests per minute per admin — high enough that legitimate
  // wizard / studio use never hits it, low enough that a runaway script
  // shows up before the cost cap fires.
  const rateDenied = enforceRateLimit({
    key: "image",
    subject: auth.userId,
    limit: 20,
    windowMs: 60_000,
  });
  if (rateDenied) return rateDenied;

  const result = await parseBody(request, generateImageSchema);
  if (!result.ok) return result.response;

  const { prompt, count = 4, negative_prompt } = result.data;

  const estimated = estimateImageCost({ count });
  const capDenied = await enforceCaps(estimated, auth.userId);
  if (capDenied) return capDenied;

  try {
    const rawUrls = await generateConceptImages(prompt, count, negative_prompt);
    // Pin durable copies in Supabase Storage. data: URLs (Easy Diffusion) and
    // 24h-lived Replicate URLs both get copied to the public bucket. On any
    // failure the helper returns the original URL — never blocks the call.
    const urls = await uploadGeneratedImages(rawUrls, "image-studio");
    // Record worst-case cost — we don't reliably know which fallback served the
    // request (Easy Diffusion / Pollinations are free); the cap is conservative.
    await recordUsage({
      route: "image",
      model: "flux-1.1-pro",
      cost_usd: estimated,
      user_id: auth.userId,
      metadata: { count },
    });
    return NextResponse.json({ urls });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "image generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
