import { NextResponse } from "next/server";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { videoCreateSchema } from "@/lib/api/schemas";
import { startVideoGeneration, VIDEO_CONFIGURED } from "@/lib/video/client";
import { estimateVideoCost } from "@/lib/cost/pricing";
import { enforceCaps } from "@/lib/cost/cap";
import { recordUsage } from "@/lib/cost/store";
import { enforceRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/generate/video
 * Body: { imageUrl, prompt, durationSec?, aspectRatio?, negativePrompt? }
 * Returns: { id, status, provider, mock? }
 */
export async function POST(request: Request) {
  const auth = await requireAdminWithId();
  if (!auth.ok) return auth.response;

  // Video is more expensive — tighter cap.
  const rateDenied = enforceRateLimit({
    key: "video",
    subject: auth.userId,
    limit: 10,
    windowMs: 60_000,
  });
  if (rateDenied) return rateDenied;

  const result = await parseBody(request, videoCreateSchema);
  if (!result.ok) return result.response;

  const durationSec = result.data.durationSec ?? 5;
  const estimated = estimateVideoCost({ durationSec });
  const capDenied = await enforceCaps(estimated);
  if (capDenied) return capDenied;

  if (!VIDEO_CONFIGURED) {
    return NextResponse.json({
      id: `dev-mock-video-${Date.now()}`,
      status: "starting",
      provider: "mock",
      mock: true,
    });
  }

  try {
    const prediction = await startVideoGeneration(result.data);
    await recordUsage({
      route: "video",
      model: prediction.provider,
      cost_usd: estimated,
      metadata: { durationSec, aspectRatio: result.data.aspectRatio },
    });
    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      provider: prediction.provider,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "video generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
