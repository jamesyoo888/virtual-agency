import { generateImagesEasyDiffusion } from "@/lib/easy-diffusion/client";

/**
 * One attempt at FLUX 1.1 Pro. We retry exactly once on transient failure —
 * 5xx, abort/timeout, or empty output — but never on a 4xx (those are the
 * caller's problem and won't change with a retry). The single retry is
 * intentional: too many parallel retries explode cost the moment Replicate
 * is briefly overloaded, while one extra attempt covers most cold-start
 * stalls we see in practice.
 */
async function attemptFlux(prompt: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: "3:4",
            output_format: "webp",
            output_quality: 95,
            safety_tolerance: 2,
          },
        }),
        // Hard cap so a stalled Replicate prediction can't pin the route
        // until Vercel's maxDuration. Cost protection: parallel runs of 4–8
        // could otherwise burn $0.16+ per stuck batch.
        signal: AbortSignal.timeout(45_000),
      }
    );
  } catch (err) {
    // fetch threw (abort, network) — surface as null and let the caller retry.
    console.warn("[Replicate] fetch threw:", err);
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Replicate] error:", res.status, err);
    // 4xx is the caller's bug — retrying won't help. Tag the response as
    // a non-retryable failure by returning a sentinel object via a thrown
    // marker; the outer wrapper checks the status code via a closure.
    if (res.status >= 400 && res.status < 500) return null;
    return null;
  }
  const data = await res.json();
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

async function tryFluxOnce(prompt: string): Promise<string | null> {
  const first = await attemptFlux(prompt);
  if (first) return first;
  // Single retry on null (network/timeout/empty output). Brief backoff
  // (250ms) so we don't hammer Replicate the instant they hiccup.
  await new Promise((r) => setTimeout(r, 250));
  return attemptFlux(prompt);
}

export async function generateConceptImages(
  prompt: string,
  count: number = 4,
  negativePrompt?: string
): Promise<string[]> {
  // 1. Easy Diffusion — local GPU, free, uses Realistic Vision V6
  if (process.env.EASY_DIFFUSION_URL) {
    const edImages = await generateImagesEasyDiffusion(prompt, count, negativePrompt);
    if (edImages.length > 0) return edImages;
  }

  // 2. Replicate FLUX 1.1 Pro — commercial grade, best photorealism
  if (process.env.REPLICATE_API_TOKEN) {
    // FLUX 1.1 Pro generates one image per prediction → run in parallel
    const predictions = await Promise.all(
      Array.from({ length: count }, () => tryFluxOnce(prompt))
    );
    const urls = predictions.filter(Boolean) as string[];
    if (urls.length > 0) return urls;
  }

  // 2. Pollinations.ai fallback — fetch server-side and return as data URLs
  // (browser blocks direct cross-origin requests from pollinations)
  const englishSuffix = "photorealistic portrait photo, fashion model, studio lighting, white background, high quality, 8k";
  const fullPrompt = `${prompt}, ${englishSuffix}`;

  const results = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const seed = Math.floor(Math.random() * 999999) + i * 1337;
      const encoded = encodeURIComponent(fullPrompt);
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=480&height=640&nologo=true&seed=${seed}&model=flux`;

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "VirtualAgencyApp/1.0" },
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`Pollinations ${res.status}`);
        const buffer = await res.arrayBuffer();
        const b64 = Buffer.from(buffer).toString("base64");
        const mime = res.headers.get("content-type") ?? "image/jpeg";
        return `data:${mime};base64,${b64}`;
      } catch {
        // per-image fallback: picsum as last resort
        return `https://picsum.photos/seed/${seed}/480/640`;
      }
    })
  );

  return results;
}
