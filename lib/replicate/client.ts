export async function generateConceptImages(
  prompt: string,
  count: number = 4
): Promise<string[]> {
  // 1. Replicate FLUX (production)
  if (process.env.REPLICATE_API_TOKEN) {
    const response = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
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
            num_outputs: count,
            aspect_ratio: "3:4",
            output_format: "webp",
          },
        }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.output?.length) return data.output;
    }
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
