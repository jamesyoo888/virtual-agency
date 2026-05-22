/**
 * v4 — Replicate FLUX Schnell ($0.003/img). Same prompt as v3 to make the
 * comparison apples-to-apples: tone + prop fidelity at Schnell quality.
 *
 * If Schnell holds up, batch cost drops $4.56 → $0.34 (92% savings).
 * If not, fall back to v3 (FLUX 1.1 Pro).
 *
 * Run:  npx tsx --env-file=.env.local scripts/gen-k-fortune-character-v4-schnell.ts
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const PROMPT = `Cinematic stylized 3D animation character portrait, modern feature-film quality, "The Voice" — a confident young adult in their mid-20s with main-character presence and adult emotional depth, three-quarter dynamic pose, head tilted slightly with quiet self-knowing confidence. Composed intelligent gaze, mouth subtly parted in mid-sentence (not theatrical, not innocent wide-eyed), expressive eyes with focused intensity. Wears an oversized vintage denim jacket with subtle holographic-chrome buttons, layered silver chain over a soft cream tee, dark indigo tapered pants. Holds a vintage chrome microphone with iridescent finish close to mouth, glowing cyan-to-gold soundwave emanating outward and dissolving into starfield. Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars, shallow depth of field. Cinematic three-point lighting — golden-hour warm key from upper left, soft cyan fill from lower right, crisp rim light separating figure from background. Stylized PBR materials, fabric weight on the denim, soft realistic skin shader with subtle pore detail, hair with natural physics. Single hero character centered, three-quarter angle, 4k cinematic studio render.`;

async function main() {
  console.log("v4 (Replicate FLUX Schnell, ~$0.003/img)");

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error("missing REPLICATE_API_TOKEN");
    process.exit(1);
  }

  const outDir = join(
    process.cwd(),
    "output",
    "k-fortune-characters",
    "the-voice",
  );
  await mkdir(outDir, { recursive: true });

  const t0 = Date.now();
  const res = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt: PROMPT,
          aspect_ratio: "3:4",
          output_format: "webp",
          output_quality: 95,
          num_outputs: 1,
          // Schnell defaults to 4 inference steps — keep it.
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`Replicate ${res.status}:`, err);
    process.exit(1);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const urls = Array.isArray(data.output) ? data.output : [data.output];
  console.log(`generation finished in ${elapsed}s, got ${urls.length} url(s)`);

  if (!urls[0]) {
    console.error("no image url in output:", JSON.stringify(data).slice(0, 300));
    process.exit(1);
  }

  const imgRes = await fetch(urls[0]);
  if (!imgRes.ok) throw new Error(`image fetch failed: ${imgRes.status}`);
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  const outPath = join(outDir, "v4-schnell.webp");
  await writeFile(outPath, bytes);
  console.log(`saved (${(bytes.length / 1024).toFixed(0)} KB): ${outPath}`);
}

main().catch((e) => {
  console.error("v4 script failed:", e);
  process.exit(1);
});
