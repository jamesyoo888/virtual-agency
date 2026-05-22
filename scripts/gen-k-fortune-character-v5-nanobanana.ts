/**
 * v5 — Nano Banana 2 (Gemini 3.1 Flash Image Preview) via Google AI Studio.
 *
 * Same IP-safe MZ-adult prompt as v3 so the comparison is apples-to-apples.
 * Free-tier eligible — no Replicate billing needed. If the tone holds up
 * against v3 (FLUX 1.1 Pro), the whole 57-114 character batch can run on
 * the AI Studio free tier at $0.
 *
 * Run:
 *   GEMINI_API_KEY=... npx tsx scripts/gen-k-fortune-character-v5-nanobanana.ts
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const MODEL = "gemini-3.1-flash-image-preview";

const PROMPT = `Cinematic stylized 3D animation character portrait, modern feature-film quality, "The Voice" — a confident young adult in their mid-20s with main-character presence and adult emotional depth, three-quarter dynamic pose, head tilted slightly with quiet self-knowing confidence. Composed intelligent gaze, mouth subtly parted in mid-sentence (not theatrical, not innocent wide-eyed), expressive eyes with focused intensity. Wears an oversized vintage denim jacket with subtle holographic-chrome buttons, layered silver chain over a soft cream tee, dark indigo tapered pants. Holds a vintage chrome microphone with iridescent finish close to mouth, glowing cyan-to-gold soundwave emanating outward and dissolving into starfield. Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars, shallow depth of field. Cinematic three-point lighting — golden-hour warm key from upper left, soft cyan fill from lower right, crisp rim light separating figure from background. Stylized PBR materials, fabric weight on the denim, soft realistic skin shader with subtle pore detail, hair with natural physics. Single hero character centered, three-quarter angle, 4k cinematic studio render. Portrait orientation, 3:4 aspect ratio.`;

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("missing GEMINI_API_KEY env var");
    process.exit(1);
  }

  console.log(`v5 (Nano Banana 2 / ${MODEL}, Google AI Studio)`);
  console.log(`prompt length: ${PROMPT.length} chars`);

  const outDir = join(
    process.cwd(),
    "output",
    "k-fortune-characters",
    "the-voice",
  );
  await mkdir(outDir, { recursive: true });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "3:4" },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const err = await res.text();
    console.error(`Gemini API ${res.status}:`, err.slice(0, 600));
    process.exit(1);
  }

  const data = await res.json();
  console.log(`response in ${elapsed}s`);

  // Walk candidates → content.parts → find inline image data. Be defensive
  // about snake_case vs camelCase since the preview API has used both.
  const parts: unknown[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  let imgB64: string | null = null;
  let mime = "image/png";
  for (const p of parts as Array<Record<string, unknown>>) {
    const inline =
      (p.inlineData as Record<string, string> | undefined) ??
      (p.inline_data as Record<string, string> | undefined);
    if (inline?.data) {
      imgB64 = inline.data;
      mime = inline.mimeType ?? inline.mime_type ?? mime;
      break;
    }
    if (typeof p.text === "string" && p.text.trim()) {
      console.log(`  (model text: ${p.text.slice(0, 120)})`);
    }
  }

  if (!imgB64) {
    console.error(
      "no inline image in response:",
      JSON.stringify(data).slice(0, 600),
    );
    process.exit(1);
  }

  const bytes = Buffer.from(imgB64, "base64");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const outPath = join(outDir, `v5-nanobanana.${ext}`);
  await writeFile(outPath, bytes);
  console.log(`saved (${(bytes.length / 1024).toFixed(0)} KB): ${outPath}`);
  console.log("compare v5 vs v3 — tone + prop fidelity. If close, batch runs free.");
}

main().catch((e) => {
  console.error("v5 script failed:", e);
  process.exit(1);
});
