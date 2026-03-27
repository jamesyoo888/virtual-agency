import { NextResponse } from "next/server";
import { createImageTo3DTask, MESHY_CONFIGURED } from "@/lib/meshy/client";

/**
 * POST /api/meshy
 * Body: { imageUrl: string }
 * Returns: { taskId: string }
 */
export async function POST(request: Request) {
  if (!MESHY_CONFIGURED) {
    // Dev fallback: return a mock task ID
    return NextResponse.json({ taskId: `dev-mock-${Date.now()}`, mock: true });
  }

  const { imageUrl } = await request.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  try {
    const taskId = await createImageTo3DTask(imageUrl, {
      enablePbr: true,
      surfaceMode: "soft",
      symmetryMode: "auto",
      topology: "quads",    // cleaner mesh for IP / rigging
      targetPolycount: 50000, // enough detail for face features
    });
    return NextResponse.json({ taskId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
