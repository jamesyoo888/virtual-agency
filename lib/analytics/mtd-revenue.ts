/**
 * Month-to-date revenue tracking + month-end projection. Pure scoring so
 * the loader is testable in isolation. Pass `nowMs` to freeze time for
 * the run-rate calculation; defaults to Date.now().
 *
 * The projection is a simple linear extrapolation: scale MTD by the
 * fraction of month elapsed. That's intentionally naïve — campaigns are
 * spiky and seasonality matters, but the operator's job is to look at the
 * raw run-rate and apply judgment. The number is a fast sanity check, not
 * a forecast.
 */
export interface DeliveredRow {
  updated_at: string;
  invoice_amount: number | null;
}

export interface MtdRevenue {
  mtdRevenue: number;
  /** Projected revenue if the current run-rate holds to month-end. */
  projectedMonthEnd: number;
  /** Same window in the previous calendar month (for ratio comparison). */
  priorMonthTotal: number;
  /** Days elapsed in the current month (inclusive of today). */
  daysElapsed: number;
  /** Total days in the current month. */
  daysInMonth: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function daysInMonth(d: Date): number {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

export function computeMtdRevenue(
  rows: DeliveredRow[],
  nowMs: number = Date.now()
): MtdRevenue {
  const now = new Date(nowMs);
  const monthStart = startOfMonthUtc(now);
  const monthStartMs = monthStart.getTime();
  // Previous month (same calendar-month name, 1 month back). We compare
  // *total* to the projection, not the same MTD slice — the question is
  // "are we on pace to beat last month".
  const priorStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const priorStartMs = priorStart.getTime();

  let mtd = 0;
  let prior = 0;
  for (const r of rows) {
    const t = Date.parse(r.updated_at);
    if (!Number.isFinite(t)) continue;
    const v = r.invoice_amount ?? 0;
    if (t >= monthStartMs && t <= nowMs) mtd += v;
    else if (t >= priorStartMs && t < monthStartMs) prior += v;
  }

  const totalDays = daysInMonth(now);
  // Days "elapsed" includes today's partial bucket — otherwise a query at
  // 09:00 on the 1st projects ~0× the month, which is misleading.
  const elapsedDays = Math.max(
    1,
    Math.ceil((nowMs - monthStartMs) / MS_PER_DAY)
  );
  const projected = (mtd / elapsedDays) * totalDays;

  return {
    mtdRevenue: mtd,
    projectedMonthEnd: Math.round(projected),
    priorMonthTotal: prior,
    daysElapsed: elapsedDays,
    daysInMonth: totalDays,
  };
}
