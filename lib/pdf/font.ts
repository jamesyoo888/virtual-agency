/**
 * Korean-capable font loader for pdf-lib. We don't commit the font binary
 * because (a) it's 1.5MB which doubles the function bundle weight, and (b)
 * jsdelivr's CDN caches the OTF aggressively. The first invocation in a
 * cold serverless instance pays the fetch cost once; subsequent calls
 * within the same instance hit the in-memory cache.
 *
 * Why Pretendard rather than NotoSansKR: Pretendard ships a single weight
 * that covers all hangul + Latin extended, and its OTF binary is ~1.5MB vs
 * NotoSansKR's ~5MB. For an A4 quotation that's strictly text, the choice
 * is invisible to the recipient but the cold-start delta is real.
 */

const FONT_URL =
  process.env.QUOTE_PDF_FONT_URL ??
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Regular.otf";

let fontCache: ArrayBuffer | null = null;
let inflight: Promise<ArrayBuffer> | null = null;

export async function loadKoreanFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  // Coalesce concurrent first-callers so we don't double-fetch on a
  // burst of cold-start requests.
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(FONT_URL, {
      // Honor the upstream cache but cap our own wait — 8s is generous for
      // a CDN that normally responds in <200ms.
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      throw new Error(`Font fetch failed: HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    fontCache = buf;
    inflight = null;
    return buf;
  })();
  return inflight;
}

/** Test seam — clear the cache so a unit test can reload. */
export function _resetFontCacheForTests() {
  fontCache = null;
  inflight = null;
}
