import { afterEach, describe, expect, it, vi } from "vitest";
import { takeToken, _resetRateBuckets } from "@/lib/api/rate-limit";

afterEach(() => {
  _resetRateBuckets();
  vi.useRealTimers();
});

describe("takeToken", () => {
  it("allows up to the limit and rejects after", () => {
    const cfg = { key: "image", subject: "u1", limit: 3, windowMs: 60_000 };
    expect(takeToken(cfg).ok).toBe(true);
    expect(takeToken(cfg).ok).toBe(true);
    expect(takeToken(cfg).ok).toBe(true);
    const denied = takeToken(cfg);
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks distinct subjects separately", () => {
    const a = { key: "image", subject: "a", limit: 1, windowMs: 60_000 };
    const b = { key: "image", subject: "b", limit: 1, windowMs: 60_000 };
    expect(takeToken(a).ok).toBe(true);
    expect(takeToken(b).ok).toBe(true);
    expect(takeToken(a).ok).toBe(false);
    expect(takeToken(b).ok).toBe(false);
  });

  it("tracks distinct keys separately", () => {
    const image = { key: "image", subject: "u1", limit: 1, windowMs: 60_000 };
    const video = { key: "video", subject: "u1", limit: 1, windowMs: 60_000 };
    expect(takeToken(image).ok).toBe(true);
    expect(takeToken(video).ok).toBe(true);
    expect(takeToken(image).ok).toBe(false);
  });

  it("resets the bucket once the window has elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const cfg = { key: "image", subject: "u1", limit: 2, windowMs: 60_000 };
    expect(takeToken(cfg).ok).toBe(true);
    expect(takeToken(cfg).ok).toBe(true);
    expect(takeToken(cfg).ok).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:00Z"));
    expect(takeToken(cfg).ok).toBe(true);
  });

  it("returns decreasing remaining and stable resetAt within a window", () => {
    const cfg = { key: "image", subject: "u1", limit: 5, windowMs: 60_000 };
    const a = takeToken(cfg);
    const b = takeToken(cfg);
    expect(b.remaining).toBe(a.remaining - 1);
    expect(b.resetAt).toBe(a.resetAt);
  });
});
