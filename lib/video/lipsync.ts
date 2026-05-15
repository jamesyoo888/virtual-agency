import {
  createPrediction,
  type ReplicatePrediction,
} from "@/lib/replicate/predictions";

/**
 * Lipsync via Replicate. Default uses the `sync` family hosted on
 * Replicate; operator can override with REPLICATE_LIPSYNC_MODEL.
 *
 * Inputs are intentionally minimal: a source video + an audio track.
 * The provider returns a synced video URL.
 */

const LIPSYNC_MODEL =
  process.env.REPLICATE_LIPSYNC_MODEL ?? "sync/lipsync-2-pro";

export interface LipsyncInput {
  videoUrl: string;
  audioUrl: string;
}

export async function startLipsync(
  v: LipsyncInput
): Promise<ReplicatePrediction & { provider: string }> {
  const input = buildInput(LIPSYNC_MODEL, v);
  const p = await createPrediction(LIPSYNC_MODEL, input);
  return { ...p, provider: LIPSYNC_MODEL };
}

function buildInput(model: string, v: LipsyncInput): Record<string, unknown> {
  if (model.startsWith("sync/")) {
    return {
      video: v.videoUrl,
      audio: v.audioUrl,
    };
  }
  // Generic fallthrough.
  return {
    video: v.videoUrl,
    audio: v.audioUrl,
  };
}
