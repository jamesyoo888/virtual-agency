/**
 * Pure stat helpers for the experiments admin dashboard.
 *
 * Wilson 95% lower bound is preferred over the raw rate because the dashboard
 * compares variants with unequal sample sizes — a small variant with a high
 * naïve rate must not beat a large variant with a slightly lower one. Wilson
 * pulls under-sampled variants down toward 0 until they've earned the rate.
 */

export function rateString(numer: number, denom: number): string {
  if (denom <= 0) return "—";
  return `${((numer / denom) * 100).toFixed(2)}%`;
}

/**
 * Wilson 95% confidence interval lower bound for a binomial proportion.
 * Source: Edwin B. Wilson, 1927. Returns a value in [0, 1].
 */
export function wilsonLower(success: number, total: number): number {
  if (total <= 0) return 0;
  const z = 1.96;
  const phat = success / total;
  const denom = 1 + (z * z) / total;
  const center = phat + (z * z) / (2 * total);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
  return Math.max(0, (center - margin) / denom);
}

export interface VariantCounts {
  impressions: number;
  conversions: number;
}

/**
 * Relative lift in conversion rate vs. a baseline variant.
 *   variant_cr / baseline_cr - 1
 * Returns null when the baseline has no conversions (undefined ratio).
 */
export function relativeLift(variant: VariantCounts, baseline: VariantCounts): number | null {
  const v = variant.impressions > 0 ? variant.conversions / variant.impressions : 0;
  const b = baseline.impressions > 0 ? baseline.conversions / baseline.impressions : 0;
  if (b === 0) return null;
  return (v - b) / b;
}

export function formatLift(lift: number | null): string {
  if (lift === null) return "—";
  const pct = lift * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
