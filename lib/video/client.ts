import {
  createPrediction,
  REPLICATE_CONFIGURED,
  type ReplicatePrediction,
} from "@/lib/replicate/predictions";

/**
 * Image-to-video generation via Replicate.
 *
 * Primary:  Kling 1.6 Pro — best human/fashion motion fidelity for
 *           Korean luxury/beauty content.
 * Fallback: Minimax video-01 — broader availability; used if Kling
 *           credits/quota errors return from Replicate.
 *
 * Model IDs are overridable via env so the operator can swap upstream
 * providers without code changes.
 */

const PRIMARY_MODEL = process.env.REPLICATE_VIDEO_MODEL ?? "kwaivgi/kling-v1.6-pro";
const FALLBACK_MODEL =
  process.env.REPLICATE_VIDEO_FALLBACK_MODEL ?? "minimax/video-01";

export interface VideoGenInput {
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  durationSec?: 5 | 10;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

export const VIDEO_CONFIGURED = REPLICATE_CONFIGURED;

/**
 * Adapt a high-level VideoGenInput into the input shape each provider expects.
 * Kept inside this module so providers stay swappable behind one interface.
 */
function buildInputFor(model: string, v: VideoGenInput): Record<string, unknown> {
  if (model.startsWith("kwaivgi/kling")) {
    return {
      prompt: v.prompt,
      start_image: v.imageUrl,
      duration: v.durationSec ?? 5,
      aspect_ratio: v.aspectRatio ?? "9:16",
      negative_prompt: v.negativePrompt ?? "",
      cfg_scale: 0.5,
    };
  }
  if (model.startsWith("minimax/video")) {
    return {
      prompt: v.prompt,
      first_frame_image: v.imageUrl,
      prompt_optimizer: true,
    };
  }
  // Generic fallthrough — pass through and let Replicate validate.
  return {
    prompt: v.prompt,
    image: v.imageUrl,
  };
}

/**
 * Submit an image-to-video prediction. Tries primary first, falls back
 * to secondary on a Replicate-side error. Returns the prediction record
 * with an extra `provider` tag so the caller can surface it in UI.
 *
 * If the primary fails we log it before attempting the fallback — without
 * this the primary error is silently lost and ops can't tell whether
 * fallback usage is healthy retries or a stuck primary.
 */
export async function startVideoGeneration(
  v: VideoGenInput
): Promise<ReplicatePrediction & { provider: string }> {
  try {
    const p = await createPrediction(PRIMARY_MODEL, buildInputFor(PRIMARY_MODEL, v));
    return { ...p, provider: PRIMARY_MODEL };
  } catch (err) {
    if (!FALLBACK_MODEL || FALLBACK_MODEL === PRIMARY_MODEL) throw err;
    const primaryMsg = err instanceof Error ? err.message : String(err);
    console.error(`[video] primary (${PRIMARY_MODEL}) failed, falling back:`, primaryMsg);
    try {
      const p = await createPrediction(
        FALLBACK_MODEL,
        buildInputFor(FALLBACK_MODEL, v)
      );
      return { ...p, provider: FALLBACK_MODEL };
    } catch (fallbackErr) {
      const fallbackMsg =
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `both providers failed — primary: ${primaryMsg}; fallback: ${fallbackMsg}`
      );
    }
  }
}
