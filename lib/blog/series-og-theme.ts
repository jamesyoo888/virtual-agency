/**
 * Per-series visual identity for /api/og?series=<id> + ?en_series=<id>.
 *
 * Each series id maps to a gradient + accent color + chip styling so social
 * cards are visually distinct in feed previews (Twitter, LinkedIn, Discord).
 * Falls back to the generic dark gradient when an id is unknown — so adding
 * a series without registering a theme is degrading-but-not-broken.
 *
 * Kept in its own module (not inline in /api/og/route.tsx) so the theme
 * registry can be tested for coverage against the BLOG_SERIES registry —
 * an unknown series id surfaces as a test failure, not a silent OG fallback.
 */

export interface SeriesOgTheme {
  gradient: string;
  accent: string;
  chipBg: string;
  chipBorder: string;
}

export const SERIES_OG_THEMES: Record<string, SeriesOgTheme> = {
  "rfp-funnel": {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 100%)",
    accent: "#818cf8",
    chipBg: "rgba(99, 102, 241, 0.12)",
    chipBorder: "rgba(129, 140, 248, 0.4)",
  },
  "character-ip": {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #2e1065 100%)",
    accent: "#c4b5fd",
    chipBg: "rgba(167, 139, 250, 0.14)",
    chipBorder: "rgba(196, 181, 253, 0.45)",
  },
  compliance: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #451a03 100%)",
    accent: "#fcd34d",
    chipBg: "rgba(245, 158, 11, 0.12)",
    chipBorder: "rgba(252, 211, 77, 0.4)",
  },
  "pricing-and-cost": {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #064e3b 100%)",
    accent: "#6ee7b7",
    chipBg: "rgba(52, 211, 153, 0.12)",
    chipBorder: "rgba(110, 231, 183, 0.4)",
  },
  "operator-honesty": {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #134e4a 100%)",
    accent: "#5eead4",
    chipBg: "rgba(20, 184, 166, 0.12)",
    chipBorder: "rgba(94, 234, 212, 0.4)",
  },
};

export function getSeriesOgTheme(seriesId: string): SeriesOgTheme | undefined {
  return SERIES_OG_THEMES[seriesId];
}
