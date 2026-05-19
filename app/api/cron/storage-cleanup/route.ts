import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "generated-images";
const MIN_AGE_HOURS = 24; // never delete fresh uploads — they may not be referenced yet

/**
 * Vercel cron: weekly sweep of orphaned objects in the generated-images
 * bucket. Configured in vercel.json:
 *
 *   { "path": "/api/cron/storage-cleanup", "schedule": "0 3 * * 0" }
 *
 * What "orphan" means here: the bucket object's public URL appears in none
 * of the columns we care about:
 *   - models.concept_image
 *   - model_files.url
 *   - projects.reference_images (text[])
 *   - generation_history.result_urls (text[])
 *
 * We do NOT delete objects younger than MIN_AGE_HOURS to avoid racing the
 * common "generate → review → save to model_files" pattern, where the URL
 * is in the response but not yet pinned anywhere queryable.
 *
 * Auth: same shape as /api/cron/weekly-digest — Vercel cron header or
 * CRON_SECRET bearer. In dev (no secret), we accept any GET.
 */
function authorize(request: Request): boolean {
  const cron = request.headers.get("x-vercel-cron");
  if (cron) return true;
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  return !secret;
}

interface StorageObject {
  name: string;
  created_at?: string | null;
}

async function listAllObjects(): Promise<StorageObject[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createAdminClient();
  const items: StorageObject[] = [];
  // Supabase storage list paginates at 1000 by default — walk recursively
  // across `namespace/YYYYMMDD/` prefixes to avoid hitting the page cap.
  const { data: top } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  for (const prefix of (top ?? []) as StorageObject[]) {
    // Folders surface as items with no metadata in supabase-js. We recurse
    // by re-listing the path; concrete file entries also come back here so
    // we keep them too.
    if ((prefix as { id?: string }).id) {
      // file at root
      items.push(prefix);
      continue;
    }
    const { data: inner } = await supabase.storage
      .from(BUCKET)
      .list(prefix.name, { limit: 1000 });
    for (const day of (inner ?? []) as StorageObject[]) {
      if ((day as { id?: string }).id) {
        items.push({ name: `${prefix.name}/${day.name}`, created_at: day.created_at });
        continue;
      }
      const { data: leaves } = await supabase.storage
        .from(BUCKET)
        .list(`${prefix.name}/${day.name}`, { limit: 1000 });
      for (const leaf of (leaves ?? []) as StorageObject[]) {
        items.push({
          name: `${prefix.name}/${day.name}/${leaf.name}`,
          created_at: leaf.created_at,
        });
      }
    }
  }
  return items;
}

async function collectReferencedUrls(): Promise<Set<string>> {
  const referenced = new Set<string>();
  if (!SUPABASE_CONFIGURED) return referenced;
  const supabase = await createAdminClient();

  const [models, files, projects, gens] = await Promise.all([
    supabase.from("models").select("concept_image"),
    supabase.from("model_files").select("url"),
    supabase.from("projects").select("reference_images"),
    supabase.from("generation_history").select("result_urls"),
  ]);

  for (const m of (models.data as { concept_image: string | null }[] | null) ?? []) {
    if (m.concept_image) referenced.add(m.concept_image);
  }
  for (const f of (files.data as { url: string | null }[] | null) ?? []) {
    if (f.url) referenced.add(f.url);
  }
  for (const p of (projects.data as { reference_images: string[] | null }[] | null) ?? []) {
    for (const u of p.reference_images ?? []) referenced.add(u);
  }
  for (const g of (gens.data as { result_urls: string[] | null }[] | null) ?? []) {
    for (const u of g.result_urls ?? []) referenced.add(u);
  }
  return referenced;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ deleted: 0, skipped: "supabase not configured" });
  }

  const supabase = await createAdminClient();
  const [objects, referenced] = await Promise.all([
    listAllObjects(),
    collectReferencedUrls(),
  ]);

  const ageCutoff = Date.now() - MIN_AGE_HOURS * 60 * 60 * 1000;
  const toDelete: string[] = [];
  for (const obj of objects) {
    if (!obj.name.includes("/")) continue; // skip stray root files
    const created = obj.created_at ? new Date(obj.created_at).getTime() : 0;
    if (created > ageCutoff) continue; // too fresh
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(obj.name);
    if (referenced.has(data.publicUrl)) continue;
    toDelete.push(obj.name);
  }

  // Batch delete in chunks of 100 — supabase-js takes an array, the
  // platform's internal API supports up to ~1000, 100 is safely under that.
  let deleted = 0;
  const errors: string[] = [];
  for (let i = 0; i < toDelete.length; i += 100) {
    const chunk = toDelete.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) {
      errors.push(error.message);
    } else {
      deleted += chunk.length;
    }
  }

  return NextResponse.json({
    scanned: objects.length,
    referenced: referenced.size,
    deleted,
    errors,
  });
}
