import { describe, it, expect } from "vitest";
import {
  computeStageTiming,
  TIMED_STAGES,
  type StageProjectInput,
} from "@/lib/analytics/stage-timing";

const NOW = Date.parse("2026-05-25T00:00:00Z");
const D = (iso: string) => Date.parse(iso);

function project(
  createdIso: string,
  transitions: Array<[string, string]>
): StageProjectInput {
  return {
    projectId: createdIso, // good-enough unique key for fixtures
    createdAtMs: D(createdIso),
    history: transitions.map(([iso, toStatus]) => ({
      toStatus,
      changedAtMs: D(iso),
    })),
  };
}

describe("computeStageTiming", () => {
  it("empty input → empty report", () => {
    const r = computeStageTiming([], { now: NOW });
    expect(r.measuredProjects).toBe(0);
    expect(r.slowestStage).toBeNull();
    for (const b of r.buckets) {
      expect(b.medianDays).toBeNull();
      expect(b.p90Days).toBeNull();
    }
  });

  it("ignores projects that never delivered", () => {
    const r = computeStageTiming(
      [
        project("2026-05-01T00:00:00Z", [
          ["2026-05-03T00:00:00Z", "brief_received"],
        ]),
      ],
      { now: NOW }
    );
    expect(r.measuredProjects).toBe(0);
  });

  it("computes dwell from createdAt to first transition (inquiry stage)", () => {
    const r = computeStageTiming(
      [
        project("2026-05-01T00:00:00Z", [
          ["2026-05-03T00:00:00Z", "brief_received"], // 2d in inquiry
          ["2026-05-05T00:00:00Z", "in_progress"], // 2d in brief
          ["2026-05-08T00:00:00Z", "review"], // 3d in in_progress
          ["2026-05-10T00:00:00Z", "delivered"], // 2d in review
        ]),
      ],
      { now: NOW }
    );
    const inquiry = r.buckets.find((b) => b.stage === "inquiry")!;
    const brief = r.buckets.find((b) => b.stage === "brief_received")!;
    const prod = r.buckets.find((b) => b.stage === "in_progress")!;
    const review = r.buckets.find((b) => b.stage === "review")!;
    expect(inquiry.medianDays).toBe(2);
    expect(brief.medianDays).toBe(2);
    expect(prod.medianDays).toBe(3);
    expect(review.medianDays).toBe(2);
    expect(r.measuredProjects).toBe(1);
  });

  it("skipped stages get no sample (zero n) but still report 0 share", () => {
    const r = computeStageTiming(
      [
        project("2026-05-01T00:00:00Z", [
          ["2026-05-04T00:00:00Z", "in_progress"], // inquiry skipped brief
          ["2026-05-09T00:00:00Z", "delivered"], // review skipped
        ]),
      ],
      { now: NOW }
    );
    const brief = r.buckets.find((b) => b.stage === "brief_received")!;
    const review = r.buckets.find((b) => b.stage === "review")!;
    expect(brief.n).toBe(0);
    expect(brief.medianDays).toBeNull();
    expect(review.n).toBe(0);
  });

  it("totalShare sums to ~1 when any stage has data", () => {
    const r = computeStageTiming(
      [
        project("2026-05-01T00:00:00Z", [
          ["2026-05-02T00:00:00Z", "brief_received"], // 1d
          ["2026-05-05T00:00:00Z", "in_progress"], // 3d
          ["2026-05-12T00:00:00Z", "delivered"], // 7d in_progress (review skipped)
        ]),
      ],
      { now: NOW }
    );
    const total = r.buckets.reduce((s, b) => s + b.totalShare, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("identifies slowest stage by median", () => {
    const r = computeStageTiming(
      [
        project("2026-05-01T00:00:00Z", [
          ["2026-05-02T00:00:00Z", "brief_received"], // inquiry 1d
          ["2026-05-04T00:00:00Z", "in_progress"], // brief 2d
          ["2026-05-20T00:00:00Z", "review"], // in_progress 16d ← slowest
          ["2026-05-21T00:00:00Z", "delivered"], // review 1d
        ]),
      ],
      { now: NOW }
    );
    expect(r.slowestStage).toBe("in_progress");
  });

  it("publishes p90 only when stage has n>=5 samples", () => {
    const projects: StageProjectInput[] = [];
    for (let i = 0; i < 6; i += 1) {
      // each project takes i+1 days in inquiry, 1d after that
      const inqDays = i + 1;
      projects.push(
        project(`2026-05-0${i + 1}T00:00:00Z`, [
          [
            new Date(
              D(`2026-05-0${i + 1}T00:00:00Z`) + inqDays * 86_400_000
            ).toISOString(),
            "delivered",
          ],
        ])
      );
    }
    const r = computeStageTiming(projects, { now: NOW });
    const inquiry = r.buckets.find((b) => b.stage === "inquiry")!;
    expect(inquiry.n).toBe(6);
    expect(inquiry.p90Days).not.toBeNull();
  });

  it("drops deliveries outside the window", () => {
    const r = computeStageTiming(
      [
        project("2025-09-01T00:00:00Z", [
          ["2025-09-05T00:00:00Z", "delivered"], // 200+d old
        ]),
        project("2026-05-10T00:00:00Z", [
          ["2026-05-12T00:00:00Z", "delivered"],
        ]),
      ],
      { now: NOW, windowDays: 90 }
    );
    expect(r.measuredProjects).toBe(1);
  });

  it("handles unsorted history (defensive sort)", () => {
    const r = computeStageTiming(
      [
        {
          projectId: "shuffled",
          createdAtMs: D("2026-05-01T00:00:00Z"),
          history: [
            { toStatus: "delivered", changedAtMs: D("2026-05-10T00:00:00Z") },
            { toStatus: "in_progress", changedAtMs: D("2026-05-05T00:00:00Z") },
            { toStatus: "brief_received", changedAtMs: D("2026-05-03T00:00:00Z") },
          ],
        },
      ],
      { now: NOW }
    );
    const inquiry = r.buckets.find((b) => b.stage === "inquiry")!;
    expect(inquiry.medianDays).toBe(2);
  });

  it("TIMED_STAGES does not include the terminal delivered state", () => {
    expect(TIMED_STAGES).not.toContain("delivered");
  });
});
