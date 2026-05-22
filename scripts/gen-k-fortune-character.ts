/**
 * One-off PoC — generate a single k-fortune COSMOS Code archetype character
 * using the same FLUX 1.1 Pro / Easy Diffusion / Pollinations chain that the
 * /api/generate/image route uses internally. First target: "The Voice"
 * (FOLUB), the project-owner archetype.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/gen-k-fortune-character.ts
 *
 * Requires REPLICATE_API_TOKEN (or EASY_DIFFUSION_URL) in env.
 * Output: writes the generated webp under output/k-fortune-characters/.
 *
 * If this PoC reads well, we expand to all 57 archetypes via a batch
 * generator in a follow-up.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { generateConceptImages } from "@/lib/replicate/client";

// ---------------------------------------------------------------------------
// Character brief — "The Voice" (FOLUB)
// ---------------------------------------------------------------------------
// COSMOS Code axes:
//   F (Fluid)     — slim self-resource, pressure flows through
//   O (Outward)   — yang-dominant, visible energy projection
//   L (Loud)      — expression channel dominant (식상 > 인성)
//   U (Pull)      — authority pressure dominates over wealth chase
//   B (Bystander) — off-orthodox / maverick path
//
// Persona read: a charismatic outsider whose voice carries pressure into
// expression. Stands apart from institutions, channels what hits them into
// what they speak. Not the establishment Captain (SOLPC). Not the wealthy
// Hustler (FOLPC). The one who broadcasts from the margin.
// ---------------------------------------------------------------------------

const PROMPT = `Pixar 3D animation style character portrait, "The Voice" — a young adult charismatic storyteller in mid-speech, dynamic three-quarter pose, soulful expressive eyes, slightly stylized proportions in the Soul / Onward / Luca era. Wears an unbuttoned deep-navy denim jacket over a soft cream tee, single small gold pin on the lapel, dark indigo pants. Holds a vintage chrome microphone close to mouth, a subtle glowing cyan-to-gold soundwave emanates outward and dissolves into stars. Confident open-mouth expression, eyes engaged with the unseen audience. Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars, shallow depth of field. Three-point lighting — golden-hour warm key from upper left, soft cyan fill from lower right, crisp rim light separating the figure from background. PBR materials, fabric weight on the denim, soft skin shader, hair with subtle physics. Single hero character, centered, cinematic studio render, 4k.`;

const NEGATIVE = `photorealistic photograph, photo realistic, anime, manga, hand-drawn 2D flat illustration, watercolor, sketch, low poly, plastic toy, generic stock photo, ugly, deformed, extra limbs, watermark, text, signature, logo, multiple characters, crowd`;

// ---------------------------------------------------------------------------

async function main() {
  console.log("k-fortune character PoC — generating The Voice (FOLUB) …");
  console.log(`prompt length: ${PROMPT.length} chars`);

  const outDir = join(
    process.cwd(),
    "output",
    "k-fortune-characters",
    "the-voice",
  );
  await mkdir(outDir, { recursive: true });
  console.log(`output dir: ${outDir}`);

  const t0 = Date.now();
  const urls = await generateConceptImages(PROMPT, 1, NEGATIVE);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`generation finished in ${elapsed}s, got ${urls.length} url(s)`);

  if (urls.length === 0) {
    console.error("no images returned — check REPLICATE_API_TOKEN and try again");
    process.exit(1);
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const label = `v${i + 1}`;
    console.log(`  ${label}: ${url.slice(0, 80)}${url.length > 80 ? "…" : ""}`);

    let bytes: Buffer;
    if (url.startsWith("data:")) {
      // Easy Diffusion / Pollinations fallback returned a data URL.
      const b64 = url.split(",", 2)[1] ?? "";
      bytes = Buffer.from(b64, "base64");
    } else {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`    fetch failed: ${res.status} ${res.statusText}`);
        continue;
      }
      bytes = Buffer.from(await res.arrayBuffer());
    }

    // FLUX returns webp by default (per replicate/client.ts).
    // Some Easy Diffusion outputs are png — sniff by magic bytes.
    const ext = bytes[0] === 0x89 && bytes[1] === 0x50 ? "png" : "webp";
    const outPath = join(outDir, `${label}.${ext}`);
    await writeFile(outPath, bytes);
    console.log(`    saved (${(bytes.length / 1024).toFixed(0)} KB): ${outPath}`);
  }

  console.log("\ndone — review the image and let me know if the style works.");
}

main().catch((e) => {
  console.error("script failed:", e);
  process.exit(1);
});
