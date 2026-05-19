import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Best-effort upload of an image (data URL or remote URL) to Supabase Storage.
 *
 * Returns the public storage URL on success, or the original URL on any
 * failure — that fallback is deliberate. The platform was shipping base64
 * data URLs directly to the browser, so a storage outage is no worse than
 * before. The win is durability: Easy Diffusion data URLs and 24-hour
 * Replicate links both get pinned to a permanent URL.
 *
 * Bucket: `generated-images` (provisioned in migration 015, public read).
 * Path:   `<namespace>/<yyyymmdd>/<uuid>.<ext>` so casual browsing of the
 *         bucket reveals when/where each image came from. `namespace` is a
 *         short label like `image-studio`, `wizard`, `auto`.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "generated-images";

interface ResolvedBlob {
  bytes: ArrayBuffer;
  mime: string;
  ext: string;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function pickExt(mime: string): string {
  return MIME_TO_EXT[mime.toLowerCase()] ?? "bin";
}

async function fetchAsBlob(url: string): Promise<ResolvedBlob | null> {
  if (url.startsWith("data:")) {
    // data:[<mediatype>][;base64],<data>
    const match = /^data:([^;,]+);base64,(.+)$/.exec(url);
    if (!match) return null;
    const mime = match[1] || "image/png";
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)).buffer;
    return { bytes, mime, ext: pickExt(mime) };
  }
  try {
    // Remote URL — pull bytes server-side. 30s upper bound stops a slow CDN
    // from pinning the route until Vercel's maxDuration.
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = await res.arrayBuffer();
    return { bytes, mime, ext: pickExt(mime) };
  } catch {
    return null;
  }
}

function dateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function randomId(): string {
  // 16 hex chars is plenty for our volume; avoids importing crypto polyfills.
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadGeneratedImage(
  sourceUrl: string,
  namespace: string = "auto"
): Promise<string> {
  if (!SUPABASE_CONFIGURED) return sourceUrl;
  // Already in our bucket? Skip the round-trip. We match by URL path rather
  // than parsing the supabase URL — anything that already contains the
  // bucket id has been pinned.
  if (sourceUrl.includes(`/${BUCKET}/`)) return sourceUrl;

  const blob = await fetchAsBlob(sourceUrl);
  if (!blob) return sourceUrl;

  const path = `${namespace}/${dateKey()}/${randomId()}.${blob.ext}`;
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob.bytes, {
        contentType: blob.mime,
        upsert: false,
        // 30-day cache — browsers cache, the showcase reuses the same paths.
        cacheControl: "2592000",
      });
    if (error) {
      console.warn(`[storage] upload failed (${path}):`, error.message);
      return sourceUrl;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl || sourceUrl;
  } catch (err) {
    console.warn("[storage] upload threw:", err);
    return sourceUrl;
  }
}

/**
 * Parallel uploader. Preserves the input order even when some uploads fail
 * (failures pass through the original URL).
 */
export async function uploadGeneratedImages(
  urls: string[],
  namespace: string = "auto"
): Promise<string[]> {
  return Promise.all(urls.map((u) => uploadGeneratedImage(u, namespace)));
}

/** Returns true if the given URL is a base64-encoded data URL. */
export function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}
