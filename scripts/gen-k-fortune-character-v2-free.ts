/**
 * v2 — Easy Diffusion on office server, FREE path. DisneyPixarCartoon768
 * checkpoint, Y2K Gen-Z/MZ adult tone (Soul / Spider-Verse adult-lane vs the
 * Toy-Story-kid-hero default).
 *
 * Why direct API instead of lib/easy-diffusion/client.ts:
 *   the lib appends ", photorealistic, high quality, studio lighting" which
 *   actively fights a stylized Pixar checkpoint. We bypass it and own the
 *   prompt suffix here.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/gen-k-fortune-character-v2-free.ts
 *
 * No env vars required — server URL is hardcoded since this is a one-off
 * PoC. Costs $0 (uses office GPU).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ED_URL = "https://api.aihubs.uk";
const MODEL = "DisneyPixarCartoon768";

const PROMPT = `modern disney pixar 3d animation style portrait of "The Voice", a confident young adult in their mid 20s with main-character energy, composed intelligent gaze with mouth slightly open mid-sentence (not theatrical, not wide-eyed), three-quarter pose, head tilted slightly with cool composure. Wears an oversized vintage denim jacket with subtle holographic-chrome buttons, layered silver chain over a soft cream tee, dark indigo tapered pants. Holds a vintage chrome microphone with subtle iridescent finish, glowing cyan-to-magenta soundwave dispersing into starfield. Background: cosmos-purple to deep-navy radial gradient with faint pinpoint stars and Y2K chrome highlights. Cinematic three-point lighting — golden-hour warm key from upper left, soft neon-cyan fill from lower right, crisp rim light. PBR materials, fabric weight on denim, realistic skin shader, hair physics. Single hero character centered, 4k cinematic studio render, Soul Onward Spider-Verse adult lane.`;

const NEGATIVE = `photorealistic photograph, photo realistic, 2D anime, manga, hand-drawn flat illustration, watercolor, sketch, low poly, plastic toy, generic stock photo, wide-eyed innocent expression, big rosy cheeks, cherubic kid hero, child, teenager, toy story style, baby, ugly, deformed, extra limbs, extra fingers, watermark, text, signature, logo, multiple characters, crowd, blurry, low quality, lowres`;

async function renderOne(): Promise<string> {
  // Two-phase Easy Diffusion API (observed empirically):
  //   1. POST /render — returns the ACK { task, stream }. Body is small.
  //   2. GET /image/stream/<task> — long-poll NDJSON, last line carries
  //      the base64 image. ED needs ~2s to register the task before the
  //      stream is open; a 404 right away is normal, retry.

  const body = {
    prompt: PROMPT,
    negative_prompt: NEGATIVE,
    seed: -1,
    used_random_seed: true,
    num_outputs: 1,
    num_inference_steps: 18, // 25 was timing out at Cloudflare proxy
    guidance_scale: 8,
    width: 512,
    height: 768,
    sampler_name: "euler_a", // lighter sampler, ED-tested
    init_image: null,
    init_image_strength: 0.7,
    stream_progress_updates: true,
    stream_image_progress: false,
    show_only_filtered_image: true,
    output_format: "png",
    output_quality: 95,
    block_nsfw: false,
    use_stable_diffusion_model: MODEL,
    use_vae_model: null,
    session_id: `kfortune_v2_${Date.now()}`,
  };

  const t0 = Date.now();
  const ackRes = await fetch(`${ED_URL}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!ackRes.ok) {
    throw new Error(`/render returned ${ackRes.status} ${ackRes.statusText}`);
  }
  const ack = await ackRes.json();
  const streamPath: string | undefined = ack.stream;
  const task = ack.task;
  if (!streamPath) {
    throw new Error(`no stream path in ack: ${JSON.stringify(ack)}`);
  }
  console.log(`  task=${task}, stream=${streamPath}`);

  // ED's stream emits concatenated JSON objects (no newlines between them).
  // We accumulate everything into `buffer` then regex-pull the data: URL out
  // of the final "succeeded" record. The stream can also be re-polled if it
  // returns a partial body (e.g. Cloudflare ending the chunked connection
  // mid-render), so we loop until the buffer contains a succeeded marker.

  const streamUrl = `${ED_URL}${streamPath}`;
  let buffer = "";
  let lastStepLogged = -1;
  const hardDeadline = Date.now() + 300_000; // 5 min hard cap

  // Lightweight progress logger that scans the buffer for the most recent step
  const logProgress = () => {
    const matches = [...buffer.matchAll(/"step":\s*(\d+),\s*"step_time":\s*[-\d.]+,\s*"total_steps":\s*(\d+)/g)];
    const last = matches[matches.length - 1];
    if (last) {
      const step = parseInt(last[1]!, 10);
      const total = parseInt(last[2]!, 10);
      if (step !== lastStepLogged) {
        process.stdout.write(`\r  rendering: step ${step}/${total}  `);
        lastStepLogged = step;
      }
    }
  };

  while (Date.now() < hardDeadline) {
    // Check if we already have the result in buffer (after a retry round)
    if (buffer.includes('"status": "succeeded"') || buffer.includes('"status":"succeeded"')) {
      break;
    }

    const sres = await fetch(streamUrl, {
      signal: AbortSignal.timeout(180_000), // single fetch can hang up to 3 min
    });
    if (sres.status === 404) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!sres.ok) {
      throw new Error(`stream returned ${sres.status} ${sres.statusText}`);
    }

    const reader = sres.body?.getReader();
    if (!reader) {
      throw new Error("no readable body on stream response");
    }
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        logProgress();
      }
      if (done) break;
    }
    // Connection closed. Either render finished (buffer has succeeded) or
    // Cloudflare cut us off mid-render. Re-poll either way; if finished, the
    // next iteration breaks on the succeeded check at top of loop.
    await new Promise((r) => setTimeout(r, 800));
  }
  process.stdout.write("\n");

  // Pull the base64 data URL straight out of the succeeded record. The data
  // field is huge (~100 KB) and self-delimiting (data:image/...;base64,XXX").
  const m = buffer.match(/"data":\s*"(data:image\/[^"]+)"/);
  if (m) {
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  succeeded in ${dur}s`);
    return m[1]!;
  }

  // Failure path — try to surface ED's error detail if it sent one
  const errMatch = buffer.match(/"status":\s*"failed",\s*"detail":\s*"([^"]{0,300})/);
  if (errMatch) {
    throw new Error(`ED reported failure: ${errMatch[1]}`);
  }
  throw new Error(`no data URL in stream after ${((Date.now() - t0) / 1000).toFixed(0)}s (${buffer.length} bytes): ${buffer.slice(0, 200)}`);
}

async function main() {
  console.log(`v2 (FREE / office Easy Diffusion + ${MODEL})`);
  console.log(`prompt length: ${PROMPT.length} chars`);
  console.log(`target: The Voice (FOLUB), Y2K MZ adult tone`);

  const outDir = join(
    process.cwd(),
    "output",
    "k-fortune-characters",
    "the-voice",
  );
  await mkdir(outDir, { recursive: true });

  const dataUrl = await renderOne();
  const b64 = dataUrl.split(",", 2)[1] ?? "";
  const bytes = Buffer.from(b64, "base64");
  const outPath = join(outDir, "v2-free.png");
  await writeFile(outPath, bytes);
  console.log(`saved (${(bytes.length / 1024).toFixed(0)} KB): ${outPath}`);
}

main().catch((e) => {
  console.error("v2 script failed:", e);
  process.exit(1);
});
