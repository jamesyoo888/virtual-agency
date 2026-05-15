import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  firstOutputUrl,
  getPrediction,
  REPLICATE_CONFIGURED,
} from "@/lib/replicate/predictions";

/**
 * GET /api/generate/lipsync/[id]
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  if (!REPLICATE_CONFIGURED || id.startsWith("dev-mock-lipsync-")) {
    const createdAt = Number.parseInt(id.replace("dev-mock-lipsync-", ""), 10);
    const elapsed = Number.isFinite(createdAt) ? Date.now() - createdAt : 5000;
    if (elapsed < 4000) {
      return NextResponse.json({ id, status: "processing", mock: true });
    }
    return NextResponse.json({
      id,
      status: "succeeded",
      output: `https://picsum.photos/seed/lip-${id}/640/960`,
      mock: true,
    });
  }

  try {
    const p = await getPrediction(id);
    return NextResponse.json({
      id: p.id,
      status: p.status,
      output: firstOutputUrl(p.output),
      error: p.error ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
