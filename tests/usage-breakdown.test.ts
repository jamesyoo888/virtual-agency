import { beforeEach, describe, expect, it } from "vitest";
import {
  breakdownUsage,
  dailyHistory,
  recordUsage,
  WINDOW_MS,
} from "@/lib/cost/store";

function resetUsageGlobals() {
  // Mutate the existing array in-place — `lib/cost/store` captures the
  // reference at module-load time, so reassigning would leave it pointing
  // at the old array.
  const g = global as unknown as { __vaUsageLog?: unknown[] };
  if (g.__vaUsageLog) g.__vaUsageLog.length = 0;
  else g.__vaUsageLog = [];
}

describe("breakdownUsage", () => {
  beforeEach(resetUsageGlobals);

  it("aggregates cost and count per route and per model", async () => {
    await recordUsage({ route: "image", model: "flux-1.1-pro", cost_usd: 0.04 });
    await recordUsage({ route: "image", model: "flux-1.1-pro", cost_usd: 0.16 });
    await recordUsage({ route: "video", model: "kwaivgi/kling-v1.6-pro", cost_usd: 0.7 });
    await recordUsage({ route: "video", model: "minimax/video-01", cost_usd: 0.5 });

    const b = await breakdownUsage(WINDOW_MS.monthly);

    expect(b.byRoute).toEqual([
      { route: "video", cost: 1.2, count: 2 },
      { route: "image", cost: expect.closeTo(0.2, 4), count: 2 },
    ]);
    expect(b.byModel[0]).toEqual({
      model: "kwaivgi/kling-v1.6-pro",
      cost: 0.7,
      count: 1,
    });
    expect(b.byModel.some((m) => m.model === "minimax/video-01")).toBe(true);
  });

  it("returns empty arrays when nothing is recorded", async () => {
    const b = await breakdownUsage(WINDOW_MS.monthly);
    expect(b.byRoute).toEqual([]);
    expect(b.byModel).toEqual([]);
  });

  it("excludes entries outside the window", async () => {
    const g = global as unknown as {
      __vaUsageLog?: Array<{ created_at: string; cost_usd: number; route: string; model: string }>;
    };
    g.__vaUsageLog = [
      {
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        cost_usd: 99,
        route: "video",
        model: "old",
      },
    ];
    await recordUsage({ route: "image", model: "flux-1.1-pro", cost_usd: 0.04 });

    const b = await breakdownUsage(WINDOW_MS.monthly); // 30d window
    const totalCost = b.byRoute.reduce((s, r) => s + r.cost, 0);
    expect(totalCost).toBeCloseTo(0.04, 4);
  });
});

describe("dailyHistory", () => {
  beforeEach(resetUsageGlobals);

  it("returns N buckets oldest-first with zeros when no data", async () => {
    const h = await dailyHistory(7);
    expect(h).toHaveLength(7);
    expect(h.every((d) => d.cost === 0)).toBe(true);
    // sequential dates
    for (let i = 1; i < h.length; i++) {
      expect(h[i].day > h[i - 1].day).toBe(true);
    }
  });

  it("attributes a recent record to today's bucket", async () => {
    await recordUsage({ route: "image", model: "x", cost_usd: 0.5 });
    const h = await dailyHistory(7);
    expect(h[h.length - 1].cost).toBeCloseTo(0.5, 4);
    // earlier buckets stay zero
    expect(h.slice(0, -1).every((d) => d.cost === 0)).toBe(true);
  });
});
