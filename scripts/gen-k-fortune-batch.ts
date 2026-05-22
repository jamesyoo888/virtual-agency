/**
 * k-fortune character batch generator — Pollinations free FLUX.
 *
 * Generates all 42 archetypes (32 COSMOS Code + 10 Day-master) at $0.
 * Resumable: an archetype whose image already exists on disk is skipped,
 * so a re-run only fills gaps. Throttled + retried to stay friendly with
 * the free endpoint.
 *
 * Run:  npx tsx scripts/gen-k-fortune-batch.ts
 *
 * Output:
 *   output/k-fortune-characters/<system>/<slug>.jpg
 *   output/k-fortune-characters/manifest.json
 *   output/k-fortune-characters/index.html   (contact sheet)
 */
import { writeFile, mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { ARCHETYPES, buildPrompt, type Archetype } from "./k-fortune-archetypes";

const OUT_ROOT = join(process.cwd(), "output", "k-fortune-characters");
const THROTTLE_MS = 4000; // gap between requests
const MAX_RETRIES = 3;
const MIN_BYTES = 18_000; // smaller than this = error placeholder, retry
const WIDTH = 768;
const HEIGHT = 1024;

interface ManifestEntry {
  slug: string;
  name: string;
  system: string;
  code: string;
  status: "ok" | "skipped" | "failed";
  bytes: number;
  file: string;
  prompt: string;
  attempts: number;
}

async function fileExists(p: string): Promise<number> {
  try {
    const s = await stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

async function generateOne(a: Archetype): Promise<{ bytes: Buffer; attempts: number } | null> {
  const prompt = buildPrompt(a);
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${WIDTH}&height=${HEIGHT}&seed=${a.seed}&nologo=true&model=flux`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "kfortune-character-batch/1.0" },
        signal: AbortSignal.timeout(150_000),
      });
      if (!res.ok) {
        console.log(`    attempt ${attempt}: HTTP ${res.status}`);
        await sleep(attempt * 3000);
        continue;
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < MIN_BYTES) {
        console.log(`    attempt ${attempt}: image too small (${bytes.length}b), retrying`);
        await sleep(attempt * 3000);
        continue;
      }
      return { bytes, attempts: attempt };
    } catch (e) {
      console.log(`    attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`);
      await sleep(attempt * 3000);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`k-fortune character batch — ${ARCHETYPES.length} archetypes via Pollinations free FLUX\n`);

  await mkdir(join(OUT_ROOT, "cosmos"), { recursive: true });
  await mkdir(join(OUT_ROOT, "daymaster"), { recursive: true });

  const manifest: ManifestEntry[] = [];
  let ok = 0, skipped = 0, failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < ARCHETYPES.length; i++) {
    const a = ARCHETYPES[i]!;
    const rel = `${a.system}/${a.slug}.jpg`;
    const outPath = join(OUT_ROOT, rel);
    const prompt = buildPrompt(a);
    const tag = `[${i + 1}/${ARCHETYPES.length}] ${a.name} (${a.code})`;

    const existing = await fileExists(outPath);
    if (existing >= MIN_BYTES) {
      console.log(`${tag} — skip (already ${(existing / 1024).toFixed(0)}KB)`);
      manifest.push({ slug: a.slug, name: a.name, system: a.system, code: a.code, status: "skipped", bytes: existing, file: rel, prompt, attempts: 0 });
      skipped++;
      continue;
    }

    console.log(`${tag} — generating…`);
    const result = await generateOne(a);
    if (result) {
      await writeFile(outPath, result.bytes);
      console.log(`    ok (${(result.bytes.length / 1024).toFixed(0)}KB, ${result.attempts} attempt${result.attempts > 1 ? "s" : ""})`);
      manifest.push({ slug: a.slug, name: a.name, system: a.system, code: a.code, status: "ok", bytes: result.bytes.length, file: rel, prompt, attempts: result.attempts });
      ok++;
    } else {
      console.log(`    FAILED after ${MAX_RETRIES} attempts`);
      manifest.push({ slug: a.slug, name: a.name, system: a.system, code: a.code, status: "failed", bytes: 0, file: rel, prompt, attempts: MAX_RETRIES });
      failed++;
    }

    if (i < ARCHETYPES.length - 1) await sleep(THROTTLE_MS);
  }

  await writeFile(
    join(OUT_ROOT, "manifest.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), counts: { ok, skipped, failed }, entries: manifest }, null, 2),
  );

  await writeFile(join(OUT_ROOT, "index.html"), buildContactSheet(manifest));

  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\ndone in ${mins} min — ok ${ok}, skipped ${skipped}, failed ${failed}`);
  console.log(`contact sheet: ${join(OUT_ROOT, "index.html")}`);
  if (failed > 0) console.log(`re-run the script to retry the ${failed} failed archetype(s).`);
}

function buildContactSheet(manifest: ManifestEntry[]): string {
  const card = (m: ManifestEntry) => {
    const img = m.status === "failed"
      ? `<div class="miss">generation failed</div>`
      : `<img loading="lazy" src="${m.file}" alt="${m.name}">`;
    return `<figure class="c">
      ${img}
      <figcaption><b>${m.name}</b><span>${m.code} · ${m.system}</span></figcaption>
    </figure>`;
  };
  const section = (title: string, sys: string) => {
    const items = manifest.filter((m) => m.system === sys).map(card).join("\n");
    return `<h2>${title}</h2><div class="grid">${items}</div>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>k-fortune characters — contact sheet</title>
<style>
  body{background:#0a0a14;color:#f0f0ff;font-family:system-ui,sans-serif;margin:0;padding:32px}
  h1{font-weight:600;letter-spacing:.04em}
  h2{margin-top:40px;color:#c9a84c;font-weight:500;border-bottom:1px solid #ffffff20;padding-bottom:6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;margin-top:16px}
  .c{margin:0;background:#ffffff08;border:1px solid #ffffff12;border-radius:12px;overflow:hidden}
  .c img{width:100%;display:block;aspect-ratio:3/4;object-fit:cover}
  .miss{aspect-ratio:3/4;display:grid;place-items:center;color:#ff8888;font-size:13px;background:#ff000010}
  figcaption{padding:8px 10px;font-size:13px;display:flex;flex-direction:column;gap:2px}
  figcaption span{color:#8888aa;font-size:11px;font-family:monospace}
</style></head><body>
<h1>k-fortune — character archetypes</h1>
<p style="color:#8888aa">Pollinations free FLUX · review draft. Hero cards can be regenerated on paid FLUX 1.1 Pro later.</p>
${section("COSMOS Code — 32 archetypes", "cosmos")}
${section("Day-master — 10 elemental archetypes", "daymaster")}
</body></html>`;
}

main().catch((e) => {
  console.error("batch failed:", e);
  process.exit(1);
});
