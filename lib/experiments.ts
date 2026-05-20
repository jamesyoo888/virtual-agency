/**
 * Cookie-based A/B experiments. Designed to live without `@vercel/flags` or
 * any external service — variant assignment is sticky per visitor for 30 days
 * via a cookie, and the proxy (`proxy.ts`) is responsible for setting that
 * cookie on first visit so the assignment is stable across the initial paint.
 *
 * Why this lives in `lib/`, not in a `<ClientProvider>`:
 *   - Server Components can read cookies but cannot mutate them mid-render;
 *     pushing the writes into the proxy keeps the call sites synchronous and
 *     prevents a hydration flash where the first paint disagrees with the
 *     bucket that later sticks.
 *   - One file means a future move to Edge Config or `@vercel/flags` only
 *     touches `pickBucket` + `getBucket`, not every consumer.
 *
 * Add a new experiment by appending to `EXPERIMENTS` below. Reading is
 * `getBucket('hero_cta')` from a Server Component, which returns the variant
 * string. Variants are an explicit type-level union for compile-time safety.
 */

import { cookies } from "next/headers";

export const EXPERIMENT_COOKIE_PREFIX = "va_exp_";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

/**
 * Set by `/api/admin/experiments/force` when an admin pins themselves to a
 * specific variant for testing. The tracker (`lib/experiments-track`) sees
 * this and skips writing impression/conversion rows — admin dry-runs must
 * not pollute the funnel data.
 */
export const EXPERIMENT_ADMIN_OVERRIDE_COOKIE = "va_exp_admin_override";

export interface ExperimentDef<V extends string> {
  key: string;
  variants: readonly V[];
  /** Optional weights matching `variants` length; defaults to equal split. */
  weights?: readonly number[];
}

// Active experiments. To retire one, leave the entry here for a release so
// existing cookies resolve correctly, then delete.
export const EXPERIMENTS = {
  hero_cta: {
    key: "hero_cta",
    variants: ["match", "browse"],
  } satisfies ExperimentDef<"match" | "browse">,
  // Compares the two similar-models strategies on the model detail page.
  // `collaborative` = "people who viewed this also viewed" (lib/analytics/co-viewed).
  // `tag`           = industry/genre tag overlap.
  // We want to know which surface drives more downstream clicks.
  similar_strategy: {
    key: "similar_strategy",
    variants: ["collaborative", "tag"],
  } satisfies ExperimentDef<"collaborative" | "tag">,
} as const;

export type ExperimentKey = keyof typeof EXPERIMENTS;
export type VariantOf<K extends ExperimentKey> = (typeof EXPERIMENTS)[K]["variants"][number];

export function cookieNameFor(key: string): string {
  return `${EXPERIMENT_COOKIE_PREFIX}${key}`;
}

/**
 * Deterministic random pick honoring `weights`. Splits at the boundaries of
 * the cumulative weight distribution so callers can adjust traffic without
 * resetting cookies.
 */
export function pickBucket<V extends string>(
  def: ExperimentDef<V>,
  random: number = Math.random()
): V {
  const weights = def.weights ?? def.variants.map(() => 1);
  if (weights.length !== def.variants.length) {
    throw new Error(`weights/variants mismatch for ${def.key}`);
  }
  const total = weights.reduce((a, b) => a + b, 0);
  const target = random * total;
  let cum = 0;
  for (let i = 0; i < def.variants.length; i++) {
    cum += weights[i];
    if (target < cum) return def.variants[i];
  }
  return def.variants[def.variants.length - 1];
}

/**
 * Sanitize a value read from a cookie/query string. Returns null if the value
 * is not one of the experiment's declared variants — callers should fall back
 * to a fresh pick or to the first variant.
 */
export function resolveVariant<V extends string>(
  def: ExperimentDef<V>,
  raw: string | undefined | null
): V | null {
  if (!raw) return null;
  return (def.variants as readonly string[]).includes(raw) ? (raw as V) : null;
}

/**
 * Server Component helper. Reads the sticky cookie; returns the first
 * declared variant if there is no cookie yet (the proxy will set one on the
 * next response so subsequent paints stabilize). The first-variant fallback
 * is deliberate: it means an experiment that hasn't seen its first request
 * still renders deterministically rather than flickering on each render.
 */
export async function getBucket<K extends ExperimentKey>(
  key: K
): Promise<VariantOf<K>> {
  const def = EXPERIMENTS[key] as ExperimentDef<VariantOf<K>>;
  const store = await cookies();
  const raw = store.get(cookieNameFor(def.key))?.value;
  const resolved = resolveVariant(def, raw);
  return resolved ?? (def.variants[0] as VariantOf<K>);
}

export const EXPERIMENT_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SEC;
