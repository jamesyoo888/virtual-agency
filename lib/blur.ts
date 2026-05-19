/**
 * Tiny inline blur placeholders for next/image. We don't want to ship the
 * sharp/plaiceholder pipeline just to compute per-image LQIPs — a generic
 * dark gradient that matches the catalog's zinc-900 backdrop hides the
 * "white flash" without adding any build cost.
 */

// 4×6 dark zinc gradient — base64-encoded SVG. Cheap to inline as the
// blurDataURL because next/image will only render it for the few hundred
// milliseconds before the real image lands.
const SHIMMER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="6">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#18181b"/>
<stop offset="1" stop-color="#27272a"/>
</linearGradient></defs>
<rect width="4" height="6" fill="url(#g)"/>
</svg>`;

function toBase64(s: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(s).toString("base64");
  }
  return window.btoa(s);
}

export const BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(SHIMMER_SVG)}`;
