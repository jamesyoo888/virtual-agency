import { NextResponse } from "next/server";
import { createImageTo3DTask, MESHY_CONFIGURED } from "@/lib/meshy/client";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { meshyCreateSchema } from "@/lib/api/schemas";
import { estimateMeshyCost } from "@/lib/cost/pricing";
import { enforceCaps } from "@/lib/cost/cap";
import { recordUsage } from "@/lib/cost/store";
import { enforceRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/meshy
 * Body: { imageUrl: string }
 * Returns: { taskId: string }
 */
export async function POST(request: Request) {
  const auth = await requireAdminWithId();
  if (!auth.ok) return auth.response;

  const rateDenied = enforceRateLimit({
    key: "meshy",
    subject: auth.userId,
    limit: 10,
    windowMs: 60_000,
  });
  if (rateDenied) return rateDenied;

  const result = await parseBody(request, meshyCreateSchema);
  if (!result.ok) return result.response;

  const estimated = estimateMeshyCost();
  const capDenied = await enforceCaps(estimated, auth.userId);
  if (capDenied) return capDenied;

  if (!MESHY_CONFIGURED) {
    return NextResponse.json({ taskId: `dev-mock-${Date.now()}`, mock: true });
  }

  try {
    const taskId = await createImageTo3DTask(result.data.imageUrl, {
      enablePbr: true,
      surfaceMode: "soft",
      symmetryMode: "auto",
      topology: "quads",
      targetPolycount: 50000,
    });
    await recordUsage({
      route: "meshy",
      model: "meshy/image-to-3d",
      cost_usd: estimated,
      user_id: auth.userId,
    });
    return NextResponse.json({ taskId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
