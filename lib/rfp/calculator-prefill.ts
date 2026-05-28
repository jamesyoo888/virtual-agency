/**
 * Translate /pricing-calculator URL params into RFP form prefills.
 *
 * The calculator's RFP CTA carries 4 raw inputs (assets, weeks, markets,
 * exclusive) + utm_source=pricing-calculator + utm_campaign=<path>.
 * The RFP form's own field set is different (duration_days, channels,
 * budget_band, etc.) — this helper closes the gap so the operator sees
 * what the buyer estimated, without forcing the buyer to re-type.
 *
 * Mappings:
 *  - weeks → duration_days (×7), only when duration_days not already set
 *  - assets / markets → prepended to message (operator visibility), only
 *    when no message provided
 *  - exclusive=1 OR exclusive=true → needsExclusive=true (the calculator
 *    emits "1" — older surfaces emit "true"; both should work)
 *
 * Pure — no I/O. Used by both KR (/rfp) and EN (/en/rfp) pages.
 */

export interface CalculatorPrefillInput {
  assets?: string | undefined;
  weeks?: string | undefined;
  markets?: string | undefined;
  exclusive?: string | undefined;
  /** Existing duration_days from the URL (don't overwrite). */
  duration_days?: string | undefined;
  /** Existing message from the URL (don't overwrite). */
  message?: string | undefined;
}

export interface CalculatorPrefillResult {
  /** Possibly overridden duration_days (string for direct form binding). */
  durationDays: string;
  /** Possibly augmented message text. */
  message: string;
  /** True when the buyer requested category exclusivity in the calculator. */
  needsExclusive: boolean;
  /** True when at least one calculator-only param was present. Lets the form
   *  show a banner like "values prefilled from your estimate". */
  fromCalculator: boolean;
}

export function applyCalculatorPrefills(
  input: CalculatorPrefillInput,
  locale: "ko" | "en" = "ko"
): CalculatorPrefillResult {
  const assets = parsePositiveInt(input.assets);
  const weeks = parsePositiveInt(input.weeks);
  const markets = parsePositiveInt(input.markets);
  const fromCalculator =
    assets !== null || weeks !== null || markets !== null;

  // duration_days takes the explicit URL value first; falls back to
  // weeks * 7 from the calculator. Stored as string for form binding.
  let durationDays = input.duration_days ?? "";
  if (!durationDays && weeks !== null) {
    durationDays = String(weeks * 7);
  }

  // Compose a calculator hint into the message when the buyer didn't
  // type one. Operator sees: "Calculator estimate: 40 assets · 12 weeks
  // · 1 market · category-exclusive".
  let message = input.message ?? "";
  if (!message && fromCalculator) {
    const parts: string[] = [];
    if (assets !== null)
      parts.push(locale === "en" ? `${assets} assets` : `${assets} 어셋`);
    if (weeks !== null)
      parts.push(locale === "en" ? `${weeks} weeks` : `${weeks}주`);
    if (markets !== null)
      parts.push(
        locale === "en"
          ? `${markets} market${markets === 1 ? "" : "s"}`
          : `${markets} 시장`
      );
    const exclusive = parseBoolish(input.exclusive);
    if (exclusive) {
      parts.push(
        locale === "en" ? "category-exclusive" : "카테고리 독점 필요"
      );
    }
    if (parts.length > 0) {
      message =
        locale === "en"
          ? `Calculator estimate: ${parts.join(" · ")}.`
          : `계산기 입력: ${parts.join(" · ")}.`;
    }
  }

  return {
    durationDays,
    message,
    needsExclusive: parseBoolish(input.exclusive),
    fromCalculator,
  };
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBoolish(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw === "1" || raw === "true";
}
