import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { summarizeUsage } from "@/lib/cost/store";
import { getCapConfig } from "@/lib/cost/cap";

/**
 * Server component — renders above all admin pages when any rolling cap is at
 * ≥80% utilization. Red at ≥95%, amber at ≥80%. Returns null when caps are
 * unconfigured or healthy so it adds no visual noise.
 */
export default async function CapWarningBanner() {
  const [caps, totals] = await Promise.all([
    getCapConfig(),
    summarizeUsage(),
  ]);

  const triggers: { window: string; pct: number; current: number; limit: number }[] = [];
  if (caps.daily && caps.daily > 0) {
    triggers.push({
      window: "daily",
      pct: totals.daily / caps.daily,
      current: totals.daily,
      limit: caps.daily,
    });
  }
  if (caps.weekly && caps.weekly > 0) {
    triggers.push({
      window: "weekly",
      pct: totals.weekly / caps.weekly,
      current: totals.weekly,
      limit: caps.weekly,
    });
  }
  if (caps.monthly && caps.monthly > 0) {
    triggers.push({
      window: "monthly",
      pct: totals.monthly / caps.monthly,
      current: totals.monthly,
      limit: caps.monthly,
    });
  }

  const hot = triggers.filter((t) => t.pct >= 0.8);
  if (hot.length === 0) return null;

  const worst = hot.reduce((a, b) => (a.pct > b.pct ? a : b));
  const isCritical = worst.pct >= 0.95;

  const tone = isCritical
    ? "border-red-900 bg-red-950/60 text-red-200"
    : "border-yellow-900/70 bg-yellow-950/40 text-yellow-200";

  return (
    <Link
      href="/admin/usage"
      className={`block border-b ${tone} px-6 py-2.5 text-sm transition-colors hover:bg-opacity-80`}
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-medium">
          {isCritical ? "비용 cap 임계 초과 임박" : "비용 cap 80% 도달"}
        </span>
        <span className="text-xs opacity-80 tabular-nums">
          {worst.window}: ${worst.current.toFixed(2)} / ${worst.limit.toFixed(2)} (
          {Math.round(worst.pct * 100)}%)
        </span>
        <span className="ml-auto text-xs opacity-70">→ /admin/usage</span>
      </div>
    </Link>
  );
}
