import { NextResponse } from "next/server";
import { sumUsage, WINDOW_MS, type UsageWindow } from "@/lib/cost/store";
import { getCapsSetting, type CapsSetting } from "@/lib/settings";

/**
 * Cost cap enforcement.
 *
 * Caps live in `app_settings.caps` (Supabase, editable from /admin/usage).
 * Env variables (COST_CAP_*_USD) fill in any unset DB values as a fallback,
 * useful before the migration is applied or to enforce a hard floor.
 *
 * Windows are rolling (not calendar) so a runaway script can't reset by
 * waiting for midnight.
 *
 * Race window: check → record is not atomic across serverless instances.
 * N concurrent calls near the limit can each pass and then collectively
 * overshoot. Mitigation guidance: set caps with a 10–15% buffer below the
 * actual ceiling you can tolerate. A proper fix needs a Postgres advisory
 * lock RPC; deferred until cap drift is observed in production.
 */

export type CapConfig = CapsSetting;

export async function getCapConfig(): Promise<CapConfig> {
  return getCapsSetting();
}

export interface CapCheckResult {
  ok: boolean;
  exceeded?: {
    window: UsageWindow;
    limit: number;
    current: number;
    estimated: number;
    wouldBe: number;
  };
}

/**
 * Check whether an upcoming call would breach any cap. Returns ok=true
 * when all caps either pass or are unset.
 */
export async function checkCaps(estimated: number): Promise<CapCheckResult> {
  const cfg = await getCapConfig();

  // 1. per-call — synchronous
  if (cfg.perCall !== null && estimated > cfg.perCall) {
    return {
      ok: false,
      exceeded: {
        window: "per_call",
        limit: cfg.perCall,
        current: 0,
        estimated,
        wouldBe: estimated,
      },
    };
  }

  // 2. rolling windows — only query the ones that are configured to avoid
  // pointless DB hits when caps are disabled.
  const windowsToCheck: { window: Exclude<UsageWindow, "per_call">; limit: number }[] = [];
  if (cfg.daily !== null) windowsToCheck.push({ window: "daily", limit: cfg.daily });
  if (cfg.weekly !== null) windowsToCheck.push({ window: "weekly", limit: cfg.weekly });
  if (cfg.monthly !== null) windowsToCheck.push({ window: "monthly", limit: cfg.monthly });

  const sums = await Promise.all(
    windowsToCheck.map((w) => sumUsage(WINDOW_MS[w.window]))
  );

  for (let i = 0; i < windowsToCheck.length; i++) {
    const { window, limit } = windowsToCheck[i];
    const current = sums[i];
    const wouldBe = current + estimated;
    if (wouldBe > limit) {
      return {
        ok: false,
        exceeded: { window, limit, current, estimated, wouldBe },
      };
    }
  }

  return { ok: true };
}

/**
 * Helper for routes: returns a 429 response if a cap would be breached,
 * or null if it's safe to proceed.
 */
export async function enforceCaps(
  estimated: number
): Promise<NextResponse | null> {
  const result = await checkCaps(estimated);
  if (result.ok) return null;
  const { window, limit, current, wouldBe } = result.exceeded!;
  return NextResponse.json(
    {
      error: "Cost cap exceeded",
      cap: window,
      limit,
      current: Number(current.toFixed(4)),
      estimated,
      wouldBe: Number(wouldBe.toFixed(4)),
    },
    { status: 429 }
  );
}
