const ED_URL = process.env.EASY_DIFFUSION_URL;

// Easy Diffusion model name (filename without extension)
const SD_MODEL = "Realistic_Vision_V6.0_NV_B1_fp16";

const DEFAULT_NEGATIVE = "nsfw, blurry, low quality, deformed, ugly, watermark";

async function renderOne(
  prompt: string,
  sessionId: string,
  negativePrompt: string
): Promise<string | null> {
  if (!ED_URL) return null;

  const body = {
    prompt: `${prompt}, photorealistic, high quality, studio lighting`,
    negative_prompt: negativePrompt,
    seed: -1,
    used_random_seed: true,
    num_outputs: 1,
    num_inference_steps: 15,      // 15 steps — fast on GTX 1660 SUPER
    guidance_scale: 7,
    width: 512,
    height: 768,
    sampler_name: "euler_a",
    init_image: null,
    init_image_strength: 0.7,
    stream_progress_updates: true,
    stream_image_progress: false,
    show_only_filtered_image: true,
    output_format: "jpeg",
    output_quality: 80,
    block_nsfw: false,
    use_stable_diffusion_model: SD_MODEL,
    use_vae_model: null,
    session_id: sessionId,
  };

  try {
    const res = await fetch(`${ED_URL}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50_000), // 50s per image
    });

    if (!res.ok) {
      console.error("[EasyDiffusion] render error:", res.status);
      return null;
    }

    // Response is NDJSON: multiple JSON lines, last successful one has image
    const text = await res.text();
    const lines = text.trim().split("\n").reverse();

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.status === "succeeded" && data.output?.[0]?.data) {
          return data.output[0].data as string; // data:image/jpeg;base64,...
        }
      } catch {
        continue;
      }
    }

    console.error("[EasyDiffusion] no succeeded output in response");
    return null;
  } catch (err) {
    console.error("[EasyDiffusion] fetch error:", err);
    return null;
  }
}

export async function generateImagesEasyDiffusion(
  prompt: string,
  count: number = 4,
  negativePrompt?: string
): Promise<string[]> {
  if (!ED_URL) return [];

  const negative = negativePrompt?.trim()
    ? `${DEFAULT_NEGATIVE}, ${negativePrompt.trim()}`
    : DEFAULT_NEGATIVE;

  const results = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      renderOne(prompt, `va_${Date.now()}_${i}`, negative)
    )
  );

  return results.filter(Boolean) as string[];
}
