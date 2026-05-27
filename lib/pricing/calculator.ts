/**
 * K-aesthetic AI campaign cost estimator.
 *
 * Pure logic. Used by /pricing-calculator (KR) and /en/pricing-calculator (EN)
 * to give buyers an honest range before they send an RFP. The math mirrors
 * the framework we use internally for deal sizing — same one we publish in
 * the "k-aesthetic-campaign-roi-calculator-framework" blog post.
 *
 * Inputs are intentionally coarse (4 dials) because finer inputs invite
 * spurious precision. Outputs are also coarse — a recommended path and a
 * KRW range with low/high band, not a single number.
 */
import { BRAND_KIT_TIERS, type BrandKitTier } from "@/lib/characters/brand-kits";

export type RecommendedPath =
  | "license_daily"
  | "paired_editorial"
  | "season_anchor"
  | "custom_build"
  | "traditional_competitive";

export interface CalculatorInput {
  /** Total deliverable count (hero + supporting + format variants). */
  assetCount: number;
  /** Weeks the campaign must run / character must be live. */
  seasonWeeks: number;
  /** Number of markets the work ships to (KR/US/EU/SG counts as 4). */
  marketCount: number;
  /** Whether category exclusivity is required over the live window. */
  needsExclusive: boolean;
}

export interface CalculatorOutput {
  recommendedPath: RecommendedPath;
  /** The brand-kit tier (if applicable) that anchors the recommendation. */
  anchorTier: BrandKitTier | null;
  /** KRW low estimate (conservative). */
  krwLow: number;
  /** KRW high estimate (high-end of scope under the recommended path). */
  krwHigh: number;
  /** USD equivalents (computed at 1300 KRW/USD, the rate we use internally). */
  usdLow: number;
  usdHigh: number;
  /** Traditional shoot benchmark for the same scope, KRW. Lets the page
   *  surface "vs traditional" savings honestly. Returns null when the scope
   *  is too small for a meaningful comparison. */
  traditionalKrwLow: number | null;
  traditionalKrwHigh: number | null;
  /** Short rationale strings — UI uses this to render bullet points. */
  rationale: string[];
  /** Operator-readable warnings / caveats that should always be visible. */
  caveats: string[];
}

const KRW_PER_USD = 1300;

function clampNonNeg(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Compute a coarse estimate. Pure — no I/O. UI calls this on every input
 * change for instant feedback.
 */
export function estimate(input: CalculatorInput): CalculatorOutput {
  const assetCount = clampNonNeg(input.assetCount);
  const seasonWeeks = clampNonNeg(input.seasonWeeks);
  const marketCount = Math.max(1, Math.min(8, Math.round(input.marketCount)));
  const needsExclusive = !!input.needsExclusive;

  // Path selection mirrors the decision tree from the calculator blog post.
  // Order matters — the first matching branch wins.
  let recommendedPath: RecommendedPath = "license_daily";

  // Tiny / quick / single-market campaigns with no exclusivity: license tier.
  // The synthetic licensing economics don't beat a traditional shoot here.
  if (
    assetCount <= 8 &&
    seasonWeeks <= 4 &&
    marketCount === 1 &&
    !needsExclusive
  ) {
    recommendedPath = "traditional_competitive";
  } else if (
    assetCount <= 30 &&
    seasonWeeks <= 8 &&
    marketCount === 1 &&
    !needsExclusive
  ) {
    recommendedPath = "license_daily";
  } else if (
    seasonWeeks > 24 ||
    (assetCount > 120 && seasonWeeks > 12) ||
    (needsExclusive && marketCount >= 4 && seasonWeeks > 12)
  ) {
    // Year-long ownership scope or very heavy cross-market exclusivity:
    // custom-build is the only path where the unit economics stop dominating.
    recommendedPath = "custom_build";
  } else if (
    seasonWeeks >= 12 ||
    marketCount >= 3 ||
    (needsExclusive && seasonWeeks > 8)
  ) {
    // Multi-market or quarter+ with exclusivity needs the Season Anchor's
    // cross-market localization layer and full quarterly exclusivity.
    recommendedPath = "season_anchor";
  } else {
    // Default mid-range: paired editorial covers 30-60 assets in a single
    // market over a brand season.
    recommendedPath = "paired_editorial";
  }

  const paired = BRAND_KIT_TIERS.find((t) => t.slug === "paired") ?? null;
  const season = BRAND_KIT_TIERS.find((t) => t.slug === "season") ?? null;
  const custom = BRAND_KIT_TIERS.find((t) => t.slug === "custom") ?? null;
  let anchorTier: BrandKitTier | null = null;

  // Per-asset recipe costs (after the first asset of a new character/recipe).
  // Mid-range KRW used for the low/high bands.
  const PER_ASSET_LOW = 100_000;
  const PER_ASSET_HIGH = 250_000;

  // Localization layer cost (one-time per non-first market). Synthetic
  // talent's actual scaling cost when adding markets.
  const LOCALIZATION_PER_EXTRA_MARKET_LOW = 1_500_000;
  const LOCALIZATION_PER_EXTRA_MARKET_HIGH = 3_500_000;

  let krwLow = 0;
  let krwHigh = 0;
  const rationale: string[] = [];
  const caveats: string[] = [];

  if (recommendedPath === "traditional_competitive") {
    // Small single-market burst — traditional shoot is competitive.
    krwLow = 6_000_000;
    krwHigh = 11_000_000;
    rationale.push(
      "스코프가 작아 일반 촬영도 비슷한 비용. 합성 talent 의 재사용 효율이 회수되기 전에 캠페인 종료."
    );
    rationale.push(
      "추후 어셋이 늘거나 시장이 추가되면 합성 talent 가 압도적으로 유리해짐 — 재방문 권장."
    );
  } else if (recommendedPath === "license_daily") {
    // Daily license + per-asset costs. No brand-kit floor.
    const licenseBase = 4_000_000;
    krwLow = licenseBase + assetCount * PER_ASSET_LOW;
    krwHigh = licenseBase + assetCount * PER_ASSET_HIGH + 2_000_000;
    rationale.push(
      `일당 라이선스 ${formatKrwRangeBriefly(licenseBase, licenseBase * 2)} + 어셋당 ₩${PER_ASSET_LOW.toLocaleString("ko-KR")}–${PER_ASSET_HIGH.toLocaleString("ko-KR")}.`
    );
    rationale.push("brand-kit 티어 floor 진입 전. 단기 캠페인에 최적.");
  } else if (recommendedPath === "paired_editorial" && paired) {
    anchorTier = paired;
    const baseAssets = Math.min(30, assetCount);
    const overflowAssets = Math.max(0, assetCount - 30);
    krwLow = paired.krw + overflowAssets * PER_ASSET_LOW;
    krwHigh =
      paired.krw + overflowAssets * PER_ASSET_HIGH + 2_500_000; // grading / kit pass
    rationale.push(
      `Paired Editorial (Yuna + Ren) 기본 ₩${paired.krw.toLocaleString("ko-KR")} — 30 어셋 + 카테고리 8주 독점 포함.`
    );
    if (overflowAssets > 0) {
      rationale.push(
        `오버플로 ${overflowAssets} 어셋 × ₩${PER_ASSET_LOW.toLocaleString("ko-KR")}–${PER_ASSET_HIGH.toLocaleString("ko-KR")} 추가.`
      );
    }
    if (baseAssets < 30) {
      caveats.push(
        `${baseAssets} 어셋만으로는 brand-kit 의 풀 가치 활용 안 됨 — 30 어셋 가까이 채울 수 있는 스코프 권장.`
      );
    }
  } else if (recommendedPath === "season_anchor" && season) {
    anchorTier = season;
    const baseAssets = Math.min(60, assetCount);
    const overflowAssets = Math.max(0, assetCount - 60);
    const extraMarkets = Math.max(0, marketCount - 1);
    krwLow =
      season.krw +
      overflowAssets * PER_ASSET_LOW +
      extraMarkets * LOCALIZATION_PER_EXTRA_MARKET_LOW;
    krwHigh =
      season.krw +
      overflowAssets * PER_ASSET_HIGH +
      extraMarkets * LOCALIZATION_PER_EXTRA_MARKET_HIGH +
      3_500_000;
    rationale.push(
      `Season Anchor (커플) 기본 ₩${season.krw.toLocaleString("ko-KR")} — 60 어셋 + 분기 카테고리 독점 + 4 시장 디스클로저 레이어 포함.`
    );
    if (extraMarkets > 0) {
      rationale.push(
        `추가 시장 × ${extraMarkets} 로컬라이제이션 레이어 ₩${LOCALIZATION_PER_EXTRA_MARKET_LOW.toLocaleString("ko-KR")}–${LOCALIZATION_PER_EXTRA_MARKET_HIGH.toLocaleString("ko-KR")}.`
      );
    }
    if (overflowAssets > 0) {
      rationale.push(
        `오버플로 ${overflowAssets} 어셋 × ₩${PER_ASSET_LOW.toLocaleString("ko-KR")}–${PER_ASSET_HIGH.toLocaleString("ko-KR")} 추가.`
      );
    }
  } else if (recommendedPath === "custom_build" && custom) {
    anchorTier = custom;
    // Custom-build economics: floor at $50K USD ≈ ₩65M but in reality
    // 18-36mo amortization with multi-year asset reuse. We surface a
    // realistic 12-month total instead of just the brand-kit floor.
    const customBase = custom.krw;
    const yearlyAssetBudget =
      assetCount * (PER_ASSET_LOW + PER_ASSET_HIGH) / 2;
    krwLow = customBase + yearlyAssetBudget * 0.6 + 30_000_000;
    krwHigh = customBase + yearlyAssetBudget + 80_000_000;
    rationale.push(
      `Custom 빌드 ${formatKrwRangeBriefly(custom.krw, custom.krw * 1.5)}+ — Yuna/Ren 위 커스텀 페이스/페어 개발.`
    );
    rationale.push(
      "12개월 어셋 + 일관성 audit + 멀티 마켓 디스클로저 디자인 포함."
    );
    caveats.push(
      "18-36개월 IP 활용 시 손익분기. 단일 캠페인용으로는 거의 항상 비합리적 — 정말 자체 캐릭터가 필요한지 사전 검증 권장."
    );
  }

  // Exclusivity uplift for license tier only — brand-kit tiers include
  // appropriate exclusivity in the headline.
  if (needsExclusive && recommendedPath === "license_daily") {
    krwLow = Math.round(krwLow * 1.8);
    krwHigh = Math.round(krwHigh * 2.5);
    rationale.push("카테고리 독점 멀티플라이어 1.8–2.5x 적용 (license tier).");
  }

  // Cross-market handling for license + paired tiers (season already
  // baked in above).
  if (
    marketCount > 1 &&
    (recommendedPath === "license_daily" ||
      recommendedPath === "paired_editorial")
  ) {
    const extraMarkets = marketCount - 1;
    krwLow += extraMarkets * LOCALIZATION_PER_EXTRA_MARKET_LOW;
    krwHigh += extraMarkets * LOCALIZATION_PER_EXTRA_MARKET_HIGH;
    rationale.push(
      `Cross-market: 추가 시장 ${extraMarkets} × 로컬라이제이션 ₩${LOCALIZATION_PER_EXTRA_MARKET_LOW.toLocaleString("ko-KR")}–${LOCALIZATION_PER_EXTRA_MARKET_HIGH.toLocaleString("ko-KR")}.`
    );
  }

  // Traditional shoot benchmark for comparison. Coarse — single-market
  // 12-asset baseline at ₩1.2M/asset, scaled by markets at the
  // traditional cross-market penalty (+60-80% per added market).
  let traditionalKrwLow: number | null = null;
  let traditionalKrwHigh: number | null = null;
  if (assetCount >= 8) {
    const tradPerAssetLow = 800_000;
    const tradPerAssetHigh = 2_000_000;
    const tradBase = 8_000_000; // crew + studio + HMUA baseline
    let tLow = tradBase + assetCount * tradPerAssetLow;
    let tHigh = tradBase + assetCount * tradPerAssetHigh;
    if (marketCount > 1) {
      // Traditional shoots don't share assets across markets — most lines
      // double / triple. We use 1.7x per extra market on the high end and
      // 1.5x on the low end.
      const factor = (lo: number) => Math.pow(lo, marketCount - 1);
      tLow = tLow * factor(1.5);
      tHigh = tHigh * factor(1.7);
    }
    traditionalKrwLow = Math.round(tLow);
    traditionalKrwHigh = Math.round(tHigh);
  }

  // Universal caveats — surface always so the buyer knows what isn't
  // baked into these numbers.
  caveats.push(
    "미디어 예산은 별도 — 본 견적은 어셋 + 라이선스 + 디스클로저 메타데이터 + 로컬라이제이션 레이어만."
  );
  caveats.push(
    "법무 검토 (face-similarity audit · 멀티 마켓 디스클로저) 가 필요한 카테고리는 +₩5–15M 별도."
  );

  return {
    recommendedPath,
    anchorTier,
    krwLow: Math.round(krwLow),
    krwHigh: Math.round(krwHigh),
    usdLow: Math.round(krwLow / KRW_PER_USD),
    usdHigh: Math.round(krwHigh / KRW_PER_USD),
    traditionalKrwLow,
    traditionalKrwHigh,
    rationale,
    caveats,
  };
}

function formatKrwRangeBriefly(low: number, high: number): string {
  if (low === high) return `₩${low.toLocaleString("ko-KR")}`;
  return `₩${low.toLocaleString("ko-KR")}–${high.toLocaleString("ko-KR")}`;
}

/**
 * Human-readable label for a recommended path. Locale-aware.
 */
export function pathLabel(path: RecommendedPath, locale: "ko" | "en"): string {
  const ko: Record<RecommendedPath, string> = {
    license_daily: "일당 라이선스",
    paired_editorial: "Paired Editorial brand-kit",
    season_anchor: "Season Anchor (커플) brand-kit",
    custom_build: "Custom multi-face (자체 IP 개발)",
    traditional_competitive: "전통 촬영 권장 (합성 talent 산수 미달)",
  };
  const en: Record<RecommendedPath, string> = {
    license_daily: "Daily license",
    paired_editorial: "Paired Editorial brand-kit",
    season_anchor: "Season Anchor (couple) brand-kit",
    custom_build: "Custom multi-face (own IP development)",
    traditional_competitive: "Traditional shoot competitive (synthetic ROI below threshold)",
  };
  return locale === "en" ? en[path] : ko[path];
}

/**
 * Stable URL builder for the «Send this brief» CTA. Drops the calculator
 * inputs into the RFP form so the operator sees what the buyer was
 * estimating.
 */
export function rfpHrefFromInputs(
  input: CalculatorInput,
  output: CalculatorOutput,
  locale: "ko" | "en"
): string {
  const q = new URLSearchParams();
  q.set("utm_source", "pricing-calculator");
  q.set("utm_campaign", output.recommendedPath);
  q.set("assets", String(input.assetCount));
  q.set("weeks", String(input.seasonWeeks));
  q.set("markets", String(input.marketCount));
  if (input.needsExclusive) q.set("exclusive", "1");
  const base = locale === "en" ? "/en/rfp" : "/rfp";
  return `${base}?${q.toString()}`;
}
