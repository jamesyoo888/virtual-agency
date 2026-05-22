/**
 * v3 — Replicate FLUX 1.1 Pro path with two changes from v1:
 *   1. Age + tone: mid-20s adult, composed presence (not wide-eyed teen)
 *   2. IP-safer prompt: drop "Pixar Animation Studios / Soul / Onward / Luca"
 *      explicit references. FLUX understands the look from descriptive
 *      visual cues alone, and downstream commercial deliverables stay
 *      defensible without trade-dress flags in the prompt itself.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/gen-k-fortune-character-v3.ts
 *
 * Cost: ~$0.04 per image. The owner archetype "The Voice" (FOLUB).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { generateConceptImages } from "@/lib/replicate/client";

// IP-safe Pixar-adjacent prompt — visual cues only, no studio/film names.
const PROMPT = `Cinematic stylized 3D animation character portrait, modern feature-film quality, "The Voice" — a confident young adult in their mid-20s with main-character presence and adult emotional depth, three-quarter dynamic pose, head tilted slightly with quiet self-knowing confidence. Composed intelligent gaze, mouth subtly parted in mid-sentence (not theatrical, not innocent wide-eyed), expressive eyes with focused intensity. Wears an oversized vintage denim jacket with subtle holographic-chrome buttons, layered silver chain over a soft cream tee, dark indigo tapered pants. Holds a vintage chrome microphone with iridescent finish close to mouth, glowing cyan-to-gold soundwave emanating outward and dissolving into starfield. Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars, shallow depth of field. Cinematic three-point lighting — golden-hour warm key from upper left, soft cyan fill from lower right, crisp rim light separating figure from background. Stylized PBR materials, fabric weight on the denim, soft realistic skin shader with subtle pore detail, hair with natural physics. Single hero character centered, three-quarter angle, 4k cinematic studio render.`;

const NEGATIVE = `photorealistic photograph, photo realistic, anime, manga, hand-drawn 2D flat illustration, watercolor, sketch, low poly, plastic toy figurine, generic stock photo, wide-eyed innocent expression, big rosy cheeks, cherubic baby-faced child, teenager, kid hero, baby, doll-like, ugly, deformed, extra limbs, extra fingers, watermark, text, signature, logo, brand mark, multiple characters, crowd, blurry, low quality`;

async function main() {
  console.log("v3 (Replicate FLUX 1.1 Pro, IP-safe prompt, MZ adult tone)");
  console.log(`prompt length: ${PROMPT.length} chars`);

  const outDir = join(
    process.cwd(),
    "output",
    "k-fortune-characters",
    "the-voice",
  );
  await mkdir(outDir, { recursive: true });

  const t0 = Date.now();
  const urls = await generateConceptImages(PROMPT, 1, NEGATIVE);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`generation finished in ${elapsed}s, got ${urls.length} url(s)`);

  if (urls.length === 0) {
    console.error("no images returned — REPLICATE_API_TOKEN missing or insufficient credit?");
    process.exit(1);
  }

  const url = urls[0]!;
  let bytes: Buffer;
  if (url.startsWith("data:")) {
    const b64 = url.split(",", 2)[1] ?? "";
    bytes = Buffer.from(b64, "base64");
  } else {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
    }
    bytes = Buffer.from(await res.arrayBuffer());
  }

  const ext = bytes[0] === 0x89 && bytes[1] === 0x50 ? "png" : "webp";
  const outPath = join(outDir, `v3.${ext}`);
  await writeFile(outPath, bytes);
  console.log(`saved (${(bytes.length / 1024).toFixed(0)} KB): ${outPath}`);
  console.log("review v3 vs v1 — prop fidelity should be ★★★★★ like v1, adult tone like v2.");
}

main().catch((e) => {
  console.error("v3 script failed:", e);
  process.exit(1);
});
