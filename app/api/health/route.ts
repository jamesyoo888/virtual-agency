import { NextResponse } from "next/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type PingResult = {
  ok: boolean;
  status?: number;
  ms?: number;
  error?: string;
  skipped?: boolean;
};

/**
 * One-shot HEAD with a short timeout. Health endpoints don't justify a long
 * wait — if Easy Diffusion needs > 2s to ack the TCP handshake, that's the
 * symptom we want to surface anyway.
 */
async function ping(url: string, timeoutMs = 2000): Promise<PingResult> {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - started,
      error: e instanceof Error ? e.message : "unknown",
    };
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const easyDiffusionUrl = process.env.EASY_DIFFUSION_URL ?? null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;

  // Run pings in parallel — each has its own timeout, so the route latency
  // is bounded by the slowest single ping, not the sum.
  const [easyDiffusionPing, supabasePing] = await Promise.all([
    easyDiffusionUrl ? ping(easyDiffusionUrl) : Promise.resolve<PingResult>({ ok: false, skipped: true }),
    supabaseUrl ? ping(`${supabaseUrl}/auth/v1/health`) : Promise.resolve<PingResult>({ ok: false, skipped: true }),
  ]);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV ?? "unknown",
    },
    integrations: {
      supabase: SUPABASE_CONFIGURED,
      easy_diffusion: Boolean(easyDiffusionUrl),
      replicate: Boolean(process.env.REPLICATE_API_TOKEN),
      meshy: Boolean(process.env.MESHY_API_KEY),
      email: (process.env.EMAIL_PROVIDER ?? "log").toLowerCase(),
    },
    pings: {
      easy_diffusion: easyDiffusionPing,
      supabase: supabasePing,
    },
    video: {
      primary: process.env.REPLICATE_VIDEO_MODEL ?? "kwaivgi/kling-v1.6-pro",
      fallback: process.env.REPLICATE_VIDEO_FALLBACK_MODEL ?? "minimax/video-01",
      lipsync: process.env.REPLICATE_LIPSYNC_MODEL ?? "sync/lipsync-2-pro",
    },
  });
}
