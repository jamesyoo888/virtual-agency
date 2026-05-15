import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  estimateImageCost,
  estimateVideoCost,
  estimateLipsyncCost,
  estimateMeshyCost,
} from "@/lib/cost/pricing";

describe("pricing estimators", () => {
  beforeEach(() => {
    // Ensure each test starts from clean env so defaults are deterministic.
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("COST_")) delete process.env[k];
    }
  });

  it("estimateImageCost scales with count using default flux price", () => {
    expect(estimateImageCost({ count: 4 })).toBeCloseTo(0.16, 4);
    expect(estimateImageCost({ count: 1 })).toBeCloseTo(0.04, 4);
    expect(estimateImageCost({ count: 0 })).toBe(0);
  });

  it("respects COST_FLUX_USD_PER_IMAGE override", () => {
    process.env.COST_FLUX_USD_PER_IMAGE = "0.10";
    expect(estimateImageCost({ count: 2 })).toBeCloseTo(0.2, 4);
  });

  it("estimateVideoCost uses max(kling, minimax-flat)", () => {
    // 5s × $0.07 = $0.35 vs $0.50 flat → flat wins
    expect(estimateVideoCost({ durationSec: 5 })).toBeCloseTo(0.5, 4);
    // 10s × $0.07 = $0.70 vs $0.50 → kling wins
    expect(estimateVideoCost({ durationSec: 10 })).toBeCloseTo(0.7, 4);
  });

  it("estimateLipsyncCost returns the flat default", () => {
    expect(estimateLipsyncCost()).toBeCloseTo(0.5, 4);
  });

  it("estimateMeshyCost returns the flat default", () => {
    expect(estimateMeshyCost()).toBeCloseTo(0.2, 4);
  });
});

describe("cap enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("COST_")) delete process.env[k];
    }
    // Reset memory store, caps DB-fallback, and the settings cache so each
    // test starts from a deterministic state.
    const g = global as unknown as {
      __vaUsageLog?: unknown[];
      __vaCapsSetting?: unknown;
      __vaCapsCache?: unknown;
    };
    if (g.__vaUsageLog) (g.__vaUsageLog as unknown[]).length = 0;
    else g.__vaUsageLog = [];
    g.__vaCapsSetting = {
      perCall: null,
      daily: null,
      weekly: null,
      monthly: null,
    };
    g.__vaCapsCache = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes when no caps configured", async () => {
    const { checkCaps } = await import("@/lib/cost/cap");
    const r = await checkCaps(100);
    expect(r.ok).toBe(true);
  });

  it("rejects per-call when estimate exceeds cap", async () => {
    process.env.COST_CAP_PER_CALL_USD = "0.40";
    const { checkCaps } = await import("@/lib/cost/cap");
    const r = await checkCaps(0.7);
    expect(r.ok).toBe(false);
    expect(r.exceeded?.window).toBe("per_call");
  });

  it("rejects daily when sum + estimate exceeds cap", async () => {
    process.env.COST_CAP_DAILY_USD = "1.00";
    const { recordUsage } = await import("@/lib/cost/store");
    const { checkCaps } = await import("@/lib/cost/cap");
    await recordUsage({ route: "video", model: "x", cost_usd: 0.9 });
    const r = await checkCaps(0.2);
    expect(r.ok).toBe(false);
    expect(r.exceeded?.window).toBe("daily");
    expect(r.exceeded?.wouldBe).toBeCloseTo(1.1, 4);
  });

  it("passes daily when sum stays under cap", async () => {
    process.env.COST_CAP_DAILY_USD = "1.00";
    const { recordUsage } = await import("@/lib/cost/store");
    const { checkCaps } = await import("@/lib/cost/cap");
    await recordUsage({ route: "video", model: "x", cost_usd: 0.5 });
    const r = await checkCaps(0.4);
    expect(r.ok).toBe(true);
  });

  it("older-than-window entries don't count toward daily", async () => {
    process.env.COST_CAP_DAILY_USD = "1.00";
    const { recordUsage } = await import("@/lib/cost/store");
    const { checkCaps } = await import("@/lib/cost/cap");

    // Inject an entry 2 days ago by reaching into the memory store directly.
    const g = global as unknown as {
      __vaUsageLog?: { created_at: string; cost_usd: number }[];
    };
    g.__vaUsageLog = [
      {
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        cost_usd: 5,
      } as never,
    ];

    // And a recent small entry that counts.
    await recordUsage({ route: "video", model: "x", cost_usd: 0.5 });

    const r = await checkCaps(0.4);
    expect(r.ok).toBe(true);
  });

  it("monthly cap fires when other windows would not", async () => {
    process.env.COST_CAP_MONTHLY_USD = "5.00";
    const { recordUsage } = await import("@/lib/cost/store");
    const { checkCaps } = await import("@/lib/cost/cap");
    for (let i = 0; i < 4; i++) {
      await recordUsage({ route: "video", model: "x", cost_usd: 1.2 });
    }
    const r = await checkCaps(0.5);
    expect(r.ok).toBe(false);
    expect(r.exceeded?.window).toBe("monthly");
  });
});

describe("enforceCaps", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("COST_")) delete process.env[k];
    }
    const g = global as unknown as {
      __vaUsageLog?: unknown[];
      __vaCapsSetting?: unknown;
      __vaCapsCache?: unknown;
    };
    if (g.__vaUsageLog) (g.__vaUsageLog as unknown[]).length = 0;
    else g.__vaUsageLog = [];
    g.__vaCapsSetting = {
      perCall: null,
      daily: null,
      weekly: null,
      monthly: null,
    };
    g.__vaCapsCache = undefined;
  });

  it("returns null when caps pass", async () => {
    const { enforceCaps } = await import("@/lib/cost/cap");
    expect(await enforceCaps(0.1)).toBeNull();
  });

  it("returns 429 NextResponse when cap exceeded", async () => {
    process.env.COST_CAP_PER_CALL_USD = "0.10";
    const { enforceCaps } = await import("@/lib/cost/cap");
    const res = await enforceCaps(0.5);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    const body = await res!.json();
    expect(body.cap).toBe("per_call");
    expect(body.limit).toBe(0.1);
  });
});
