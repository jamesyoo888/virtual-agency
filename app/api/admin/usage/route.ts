import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { summarizeUsage, recentUsage } from "@/lib/cost/store";
import { getCapConfig } from "@/lib/cost/cap";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/usage
 * Returns: { caps, totals: { daily, weekly, monthly }, recent: UsageEntry[] }
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const [totals, recent, caps] = await Promise.all([
    summarizeUsage(),
    recentUsage(50),
    getCapConfig(),
  ]);

  return NextResponse.json({
    caps,
    totals,
    recent,
  });
}
