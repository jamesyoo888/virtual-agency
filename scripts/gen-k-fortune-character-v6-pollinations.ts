/**
 * v6 — Pollinations.ai (free FLUX, no API key). Same IP-safe MZ-adult prompt
 * as v3 so we can judge how far the genuinely-free path sits below the paid
 * FLUX 1.1 Pro result.
 *
 * Run:  npx tsx scripts/gen-k-fortune-character-v6-pollinations.ts
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const PROMPT = `Cinematic stylized 3D animation character portrait, modern feature-film quality, "The Voice" — a confident young adult in their mid-20s with main-character presence and adult emotional depth, three-quarter dynamic pose, head tilted slightly with quiet self-knowing confidence. Composed intelligent gaze, mouth subtly parted in mid-sentence (not theatrical, not innocent wide-eyed), expressive eyes with focused intensity. Wears an oversized vintage denim jacket with subtle holographic-chrome buttons, layered silver chain over a soft cream tee, dark indigo tapered pants. Holds a vintage chrome microphone with iridescent finish close to mouth, glowing cyan-to-gold soundwave emanating outward and dissolving into starfield. Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars, shallow depth of field. Cinematic three-point lighting, stylized PBR materials, soft realistic skin shader. Single hero character centered, three-quarter angle, 4k cinematic studio render.`;

async function main() {
  console.log("v6 (Pollinations.ai free FLUX)");

  const outDir = join(
    process.cwd(),
    "output",
    "k-fortune-characters",
    "the-voice",
  );
  await mkdir(outDir, { recursive: true });

  const seed = 778899;
  const encoded = encodeURIComponent(PROMPT);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&seed=${seed}&nologo=true&model=flux`;

  const t0 = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": "kfortune-character-poc/1.0" },
    signal: AbortSignal.timeout(120_000),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    console.error(`Pollinations ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const outPath = join(outDir, `v6-pollinations.${ext}`);
  await writeFile(outPath, bytes);
  console.log(`generation finished in ${elapsed}s`);
  console.log(`saved (${(bytes.length / 1024).toFixed(0)} KB, ${mime}): ${outPath}`);
}

main().catch((e) => {
  console.error("v6 script failed:", e);
  process.exit(1);
});
