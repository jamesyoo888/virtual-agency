import { describe, it, expect } from "vitest";
import {
  computeSlowOpenProjects,
  type SlowOpenProjectInput,
} from "@/lib/analytics/slow-open-projects";

const NOW = Date.parse("2026-05-25T00:00:00Z");
const dayMs = 86_400_000;

function input(
  id: string,
  daysAgo: number,
  invoice: number | null = null
): SlowOpenProjectInput {
  return {
    id,
    title: `Project ${id}`,
    status: "in_progress",
    modelName: "Test Model",
    invoiceAmount: invoice,
    updatedAtMs: NOW - daysAgo * dayMs,
    enteredCurrentStageAtMs: NOW - daysAgo * dayMs,
  };
}

describe("computeSlowOpenProjects", () => {
  it("returns empty array when no inputs", () => {
    expect(computeSlowOpenProjects([], { now: NOW })).toEqual([]);
  });

  it("sorts by daysInStage desc and caps at limit", () => {
    const r = computeSlowOpenProjects(
      [input("a", 3), input("b", 17), input("c", 8), input("d", 22), input("e", 1)],
      { now: NOW, limit: 3 }
    );
    expect(r.map((p) => p.id)).toEqual(["d", "b", "c"]);
    expect(r[0].daysInStage).toBe(22);
  });

  it("invoice desc tiebreak when daysInStage equal", () => {
    const r = computeSlowOpenProjects(
      [input("a", 10, 100), input("b", 10, 500), input("c", 10, null)],
      { now: NOW }
    );
    expect(r.map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("falls back to updated_at when no history entry, flagged in source", () => {
    const r = computeSlowOpenProjects(
      [
        {
          id: "legacy",
          title: "Legacy project",
          status: "review",
          modelName: null,
          invoiceAmount: null,
          updatedAtMs: NOW - 9 * dayMs,
          enteredCurrentStageAtMs: null,
        },
      ],
      { now: NOW }
    );
    expect(r).toHaveLength(1);
    expect(r[0].daysInStage).toBe(9);
    expect(r[0].fallbackSource).toBe("updated_at");
  });

  it("uses history timestamp when present, flagged correctly", () => {
    const r = computeSlowOpenProjects(
      [
        {
          ...input("p1", 30),
          enteredCurrentStageAtMs: NOW - 12 * dayMs, // history newer than updated_at would be irrelevant; this asserts we use enteredCurrentStageAtMs
        },
      ],
      { now: NOW }
    );
    expect(r[0].daysInStage).toBe(12);
    expect(r[0].fallbackSource).toBe("history");
  });

  it("clamps daysInStage to 0 for future timestamps (clock skew safety)", () => {
    const r = computeSlowOpenProjects(
      [
        {
          ...input("future", 0),
          enteredCurrentStageAtMs: NOW + 5 * dayMs, // future
        },
      ],
      { now: NOW }
    );
    expect(r[0].daysInStage).toBe(0);
  });
});
