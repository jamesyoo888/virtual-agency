/**
 * Per-call cost estimation in USD for paid generation routes.
 *
 * These numbers are operator-tunable via env so we don't have to redeploy
 * when an upstream provider changes pricing. Defaults are approximate as of
 * 2026-05 and intentionally conservative (worst-case for the route).
 */

export type PaidRoute = "image" | "video" | "lipsync" | "meshy";

function envNum(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ── per-model unit costs (USD) ───────────────────────────────────────────────
// Image: Replicate FLUX 1.1 Pro is the fallback for the image route; assume
// worst-case so the cap is conservative if Easy Diffusion (free) is bypassed.
export const PRICE_FLUX_PER_IMAGE = () => envNum("COST_FLUX_USD_PER_IMAGE", 0.04);

// Video: Kling 1.6 Pro charges per second; Minimax is roughly a flat clip price.
export const PRICE_KLING_PER_SEC = () => envNum("COST_KLING_USD_PER_SEC", 0.07);
export const PRICE_MINIMAX_PER_CLIP = () => envNum("COST_MINIMAX_USD_PER_CLIP", 0.5);

// Lipsync: charged per output-second. We can't know audio length up front
// without probing, so default to a flat estimate.
export const PRICE_LIPSYNC_FLAT = () => envNum("COST_LIPSYNC_FLAT_USD", 0.5);

// Meshy image-to-3D — single flat task price.
export const PRICE_MESHY_PER_TASK = () => envNum("COST_MESHY_USD_PER_TASK", 0.2);

// ── input shapes for estimation ──────────────────────────────────────────────
export interface ImageEstimateInput {
  count: number;
}

export interface VideoEstimateInput {
  durationSec: number;
}

// ── route-level estimators ───────────────────────────────────────────────────
export function estimateImageCost(input: ImageEstimateInput): number {
  return Math.max(0, input.count) * PRICE_FLUX_PER_IMAGE();
}

/**
 * Worst-case video estimate. We take the max of the per-second (Kling) and
 * the flat fallback (Minimax) prices so the cap is *never* understated, no
 * matter which provider actually serves the request. Better to occasionally
 * reject a borderline cap-breaching call than to silently overspend.
 */
export function estimateVideoCost(input: VideoEstimateInput): number {
  const klingEst = Math.max(1, input.durationSec) * PRICE_KLING_PER_SEC();
  return Math.max(klingEst, PRICE_MINIMAX_PER_CLIP());
}

export function estimateLipsyncCost(): number {
  return PRICE_LIPSYNC_FLAT();
}

export function estimateMeshyCost(): number {
  return PRICE_MESHY_PER_TASK();
}
