import { generateImagesEasyDiffusion } from "@/lib/easy-diffusion/client";

export async function generateConceptImages(
  prompt: string,
  count: number = 4
): Promise<string[]> {
  // 1. Easy Diffusion — local GPU, free, uses Realistic Vision V6
  if (process.env.EASY_DIFFUSION_URL) {
    const edImages = await generateImagesEasyDiffusion(prompt, count);
    if (edImages.length > 0) return edImages;
  }

  // 2. Replicate FLUX 1.1 Pro — commercial grade, best photorealism
  if (process.env.REPLICATE_API_TOKEN) {
    // FLUX 1.1 Pro generates one image per prediction → run in parallel
    const predictions = await Promise.all(
      Array.from({ length: count }, async () => {
        const res = await fetch(
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
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("[Replicate] error:", res.status, err);
          return null;
        }
        const data = await res.json();
        // output is a single URL string or array
        return Array.isArray(data.output) ? data.output[0] : data.output;
      })
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
