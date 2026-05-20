/**
 * URL-based media classification. We don't store MIME type in `model_files`,
 * so we infer from the file extension (or `?ext=` query param used by some
 * Supabase Storage signed URLs).
 */

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogv"] as const;
const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
] as const;

function extensionOf(url: string): string | null {
  try {
    const u = new URL(url, "http://x");
    const pathname = u.pathname;
    const dot = pathname.lastIndexOf(".");
    if (dot < 0 || dot === pathname.length - 1) return null;
    return pathname.slice(dot + 1).toLowerCase();
  } catch {
    return null;
  }
}

export function isVideoUrl(url: string): boolean {
  const ext = extensionOf(url);
  if (!ext) return false;
  return (VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

export function isImageUrl(url: string): boolean {
  const ext = extensionOf(url);
  if (!ext) return false;
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}
