// Phase 1: stub — returns mock image URL
// Phase 2: replace with real Replicate API call

export async function generateConceptImages(
  prompt: string,
  count: number = 4
): Promise<string[]> {
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
      return data.output ?? [];
    }
  }

  // Fallback: placeholder images
  return Array.from(
    { length: count },
    (_, i) =>
      `https://picsum.photos/seed/${encodeURIComponent(prompt)}-${i}/480/640`
  );
}
