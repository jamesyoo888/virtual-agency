import { NextResponse } from "next/server";
import { getMeshyTask, MESHY_CONFIGURED } from "@/lib/meshy/client";

/**
 * GET /api/meshy/task/[taskId]
 * Returns task status + model URLs when done.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  if (!MESHY_CONFIGURED || taskId.startsWith("dev-mock-")) {
    // Dev fallback: simulate task completion after a short time
    const createdAt = parseInt(taskId.replace("dev-mock-", ""), 10);
    const elapsed = Date.now() - createdAt;

    if (elapsed < 5000) {
      return NextResponse.json({ id: taskId, status: "IN_PROGRESS", progress: Math.min(80, Math.floor(elapsed / 60)) });
    }
    return NextResponse.json({
      id: taskId,
      status: "SUCCEEDED",
      progress: 100,
      thumbnail_url: `https://picsum.photos/seed/${taskId}/400/400`,
      model_urls: {
        glb: null,
        fbx: null,
      },
      mock: true,
    });
  }

  try {
    const task = await getMeshyTask(taskId);
    return NextResponse.json(task);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
