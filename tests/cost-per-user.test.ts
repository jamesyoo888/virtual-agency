import { beforeEach, describe, expect, it } from "vitest";
import { recordUsage, sumUsage, spendByUser } from "@/lib/cost/store";

declare global {
  var __vaUsageLog: import("@/lib/cost/store").UsageEntry[] | undefined;
}

function resetStore() {
  globalThis.__vaUsageLog = [];
}

describe("cost / per-user spend", () => {
  beforeEach(() => {
    resetStore();
  });

  it("sumUsage with userId returns only that user's spend", async () => {
    await recordUsage({ route: "image", model: "x", cost_usd: 0.5, user_id: "u1" });
    await recordUsage({ route: "image", model: "x", cost_usd: 0.25, user_id: "u2" });
    await recordUsage({ route: "image", model: "x", cost_usd: 0.1, user_id: "u1" });

    const allTime = 0;
    expect(await sumUsage(allTime)).toBeCloseTo(0.85, 4);
    expect(await sumUsage(allTime, "u1")).toBeCloseTo(0.6, 4);
    expect(await sumUsage(allTime, "u2")).toBeCloseTo(0.25, 4);
    expect(await sumUsage(allTime, "ghost")).toBe(0);
  });

  it("sumUsage(userId=null) is identical to omitted (global sum)", async () => {
    await recordUsage({ route: "image", model: "x", cost_usd: 1.0, user_id: "u1" });
    expect(await sumUsage(0, null)).toBeCloseTo(1.0, 4);
  });

  it("spendByUser ranks users by spend desc and counts calls", async () => {
    await recordUsage({ route: "image", model: "x", cost_usd: 0.5, user_id: "u1" });
    await recordUsage({ route: "image", model: "x", cost_usd: 0.5, user_id: "u1" });
    await recordUsage({ route: "image", model: "x", cost_usd: 0.3, user_id: "u2" });

    const rows = await spendByUser(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ user_id: "u1", cost: 1.0, count: 2 });
    expect(rows[1]).toEqual({ user_id: "u2", cost: 0.3, count: 1 });
  });

  it("spendByUser buckets entries missing user_id under '(unknown)'", async () => {
    await recordUsage({ route: "image", model: "x", cost_usd: 0.5 });
    await recordUsage({ route: "image", model: "x", cost_usd: 0.5, user_id: null });
    const rows = await spendByUser(0);
    expect(rows).toEqual([{ user_id: "(unknown)", cost: 1.0, count: 2 }]);
  });
});
