import { beforeEach, describe, expect, it, vi } from "vitest";

describe("settings — caps", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("COST_")) delete process.env[k];
    }
    const g = global as unknown as {
      __vaCapsSetting?: unknown;
      __vaCapsCache?: unknown;
    };
    g.__vaCapsSetting = {
      perCall: null,
      daily: null,
      weekly: null,
      monthly: null,
    };
    g.__vaCapsCache = undefined;
  });

  it("returns nulls when nothing is configured", async () => {
    const { getCapsSetting } = await import("@/lib/settings");
    const caps = await getCapsSetting();
    expect(caps).toEqual({
      perCall: null,
      daily: null,
      weekly: null,
      monthly: null,
    });
  });

  it("falls back to env when DB is empty", async () => {
    process.env.COST_CAP_DAILY_USD = "10";
    process.env.COST_CAP_MONTHLY_USD = "150";
    const { getCapsSetting } = await import("@/lib/settings");
    const caps = await getCapsSetting();
    expect(caps.daily).toBe(10);
    expect(caps.monthly).toBe(150);
    expect(caps.perCall).toBeNull();
  });

  it("DB value wins over env", async () => {
    process.env.COST_CAP_DAILY_USD = "10";
    const { updateCapsSetting, getCapsSetting, invalidateCapsCache } =
      await import("@/lib/settings");
    await updateCapsSetting({ daily: 25 });
    invalidateCapsCache();
    const caps = await getCapsSetting();
    expect(caps.daily).toBe(25);
  });

  it("clearing a DB cap restores env fallback", async () => {
    process.env.COST_CAP_DAILY_USD = "10";
    const { updateCapsSetting, getCapsSetting, invalidateCapsCache } =
      await import("@/lib/settings");
    await updateCapsSetting({ daily: 25 });
    invalidateCapsCache();
    expect((await getCapsSetting()).daily).toBe(25);

    await updateCapsSetting({ daily: null });
    invalidateCapsCache();
    expect((await getCapsSetting()).daily).toBe(10);
  });

  it("rejects zero/negative values via normalize (stored as null)", async () => {
    const { updateCapsSetting, getCapsSetting, invalidateCapsCache } =
      await import("@/lib/settings");
    await updateCapsSetting({
      perCall: -5 as never,
      daily: 0 as never,
      weekly: 50,
    });
    invalidateCapsCache();
    const caps = await getCapsSetting();
    expect(caps.perCall).toBeNull();
    expect(caps.daily).toBeNull();
    expect(caps.weekly).toBe(50);
  });
});
