import { describe, it, expect } from "vitest";
import { computeResponseSla } from "@/lib/analytics/response-sla";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-05-21T12:00:00.000Z");

describe("computeResponseSla", () => {
  it("returns zeros when no inputs", () => {
    const r = computeResponseSla([], NOW, 30);
    expect(r.totalInquiries).toBe(0);
    expect(r.medianHours).toBeNull();
    expect(r.p90Hours).toBeNull();
  });

  it("counts responded vs open", () => {
    const r = computeResponseSla(
      [
        { createdAtMs: NOW - 3 * HOUR, firstMoveAtMs: NOW - 2 * HOUR }, // 1h
        { createdAtMs: NOW - 5 * HOUR, firstMoveAtMs: null }, // open, 5h old
        { createdAtMs: NOW - 30 * HOUR, firstMoveAtMs: null }, // stale, 30h
      ],
      NOW
    );
    expect(r.totalInquiries).toBe(3);
    expect(r.respondedCount).toBe(1);
    expect(r.openCount).toBe(2);
    expect(r.staleOpenCount).toBe(1);
  });

  it("median uses nearest-rank on responded only", () => {
    const r = computeResponseSla(
      [
        { createdAtMs: NOW - 11 * HOUR, firstMoveAtMs: NOW - 10 * HOUR }, // 1h
        { createdAtMs: NOW - 5 * HOUR, firstMoveAtMs: NOW - 3 * HOUR }, // 2h
        { createdAtMs: NOW - 13 * HOUR, firstMoveAtMs: NOW - 10 * HOUR }, // 3h
      ],
      NOW
    );
    expect(r.medianHours).toBe(2);
  });

  it("p90 requires at least 5 responses", () => {
    const r = computeResponseSla(
      [
        { createdAtMs: NOW - 1 * HOUR, firstMoveAtMs: NOW - 0.5 * HOUR },
        { createdAtMs: NOW - 1 * HOUR, firstMoveAtMs: NOW - 0.5 * HOUR },
      ],
      NOW
    );
    expect(r.p90Hours).toBeNull();
  });

  it("p90 returns the 90th percentile when enough data", () => {
    const inputs = Array.from({ length: 10 }, (_, i) => ({
      createdAtMs: NOW - (i + 2) * HOUR,
      firstMoveAtMs: NOW - 1 * HOUR, // response time = (i+1) hours
    }));
    const r = computeResponseSla(inputs, NOW);
    // Sorted [1..10] — 90th nearest-rank = 9
    expect(r.p90Hours).toBe(9);
  });

  it("ignores negative response times (clock skew safety)", () => {
    const r = computeResponseSla(
      [
        { createdAtMs: NOW - 1 * HOUR, firstMoveAtMs: NOW - 2 * HOUR }, // bogus
        { createdAtMs: NOW - 3 * HOUR, firstMoveAtMs: NOW - 1 * HOUR }, // 2h
      ],
      NOW
    );
    expect(r.respondedCount).toBe(2);
    expect(r.medianHours).toBe(2);
  });
});
