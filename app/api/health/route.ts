import { NextResponse } from "next/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV ?? "unknown",
    },
    integrations: {
      supabase: SUPABASE_CONFIGURED,
      easy_diffusion: Boolean(process.env.EASY_DIFFUSION_URL),
      replicate: Boolean(process.env.REPLICATE_API_TOKEN),
      meshy: Boolean(process.env.MESHY_API_KEY),
    },
    video: {
      primary: process.env.REPLICATE_VIDEO_MODEL ?? "kwaivgi/kling-v1.6-pro",
      fallback: process.env.REPLICATE_VIDEO_FALLBACK_MODEL ?? "minimax/video-01",
      lipsync: process.env.REPLICATE_LIPSYNC_MODEL ?? "sync/lipsync-2-pro",
    },
  });
}
