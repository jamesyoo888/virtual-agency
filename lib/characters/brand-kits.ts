/**
 * Brand-kit tier constants shared by /character/brand-kits, /en/character/brand-kits,
 * and the per-character detail pages. Single source of truth so price drift between
 * surfaces is impossible.
 *
 * Currency: KRW is authoritative. USD is a campaign-room number, not a live FX rate —
 * Stripe Checkout still bills the user-locale price set on the Checkout session.
 */

export interface BrandKitTier {
  slug: "paired" | "season" | "custom";
  /** Korean kit name. */
  nameKo: string;
  /** English kit name. */
  nameEn: string;
  /** KRW headline price (Korean buyers). Use 0 for "starting at" if priceFromKo applies. */
  krw: number;
  /** USD headline price for English buyers. */
  usd: number;
  /** Whether the price is a floor (e.g. "from $50K+"). */
  startingAt: boolean;
  /** Cadence — "quarter" by convention for current Phase 1.1 tiers. */
  cadence: "quarter";
  /** Which characters this tier covers. */
  characters: string;
}

export const BRAND_KIT_TIERS: BrandKitTier[] = [
  {
    slug: "paired",
    nameKo: "페어 에디토리얼",
    nameEn: "Paired editorial",
    krw: 11_000_000,
    usd: 8_500,
    startingAt: false,
    cadence: "quarter",
    characters: "Yuna + Ren",
  },
  {
    slug: "season",
    nameKo: "시즌 앵커 (커플)",
    nameEn: "Season anchor (couple)",
    krw: 28_500_000,
    usd: 22_000,
    startingAt: false,
    cadence: "quarter",
    characters: "Yuna + Ren",
  },
  {
    slug: "custom",
    nameKo: "커스텀 멀티 페이스",
    nameEn: "Custom multi-face",
    krw: 65_000_000,
    usd: 50_000,
    startingAt: true,
    cadence: "quarter",
    characters: "Yuna + Ren + custom",
  },
];

export function getKitTier(slug: BrandKitTier["slug"]): BrandKitTier | undefined {
  return BRAND_KIT_TIERS.find((t) => t.slug === slug);
}

const KRW_FMT = new Intl.NumberFormat("ko-KR");
const USD_FMT = new Intl.NumberFormat("en-US");

export function formatKrw(amount: number, starting = false): string {
  const v = `₩${KRW_FMT.format(amount)}`;
  return starting ? `${v}부터` : v;
}

export function formatUsd(amount: number, starting = false): string {
  if (amount >= 1_000) {
    const k = amount / 1_000;
    const v = `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
    return starting ? `${v}+` : v;
  }
  const v = `$${USD_FMT.format(amount)}`;
  return starting ? `${v}+` : v;
}
