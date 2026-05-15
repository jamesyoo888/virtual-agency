import { NextResponse } from "next/server";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { lipsyncCreateSchema } from "@/lib/api/schemas";
import { startLipsync } from "@/lib/video/lipsync";
import { REPLICATE_CONFIGURED } from "@/lib/replicate/predictions";
import { estimateLipsyncCost } from "@/lib/cost/pricing";
import { enforceCaps } from "@/lib/cost/cap";
import { recordUsage } from "@/lib/cost/store";
import { enforceRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/generate/lipsync
 * Body: { videoUrl, audioUrl }
 * Returns: { id, status, provider, mock? }
 */
export async function POST(request: Request) {
  const auth = await requireAdminWithId();
  if (!auth.ok) return auth.response;

  const rateDenied = enforceRateLimit({
    key: "lipsync",
    subject: auth.userId,
    limit: 10,
    windowMs: 60_000,
  });
  if (rateDenied) return rateDenied;

  const result = await parseBody(request, lipsyncCreateSchema);
  if (!result.ok) return result.response;

  const estimated = estimateLipsyncCost();
  const capDenied = await enforceCaps(estimated, auth.userId);
  if (capDenied) return capDenied;

  if (!REPLICATE_CONFIGURED) {
    return NextResponse.json({
      id: `dev-mock-lipsync-${Date.now()}`,
      status: "starting",
      provider: "mock",
      mock: true,
    });
  }

  try {
    const prediction = await startLipsync(result.data);
    await recordUsage({
      route: "lipsync",
      model: prediction.provider,
      cost_usd: estimated,
      user_id: auth.userId,
    });
    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      provider: prediction.provider,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "lipsync failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
