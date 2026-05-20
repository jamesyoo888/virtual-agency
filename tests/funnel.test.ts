import { describe, it, expect } from "vitest";
import { stageConversionRate, FUNNEL_STAGES } from "@/lib/analytics/funnel";

describe("stageConversionRate", () => {
  it("returns the ratio of next to current reached counts", () => {
    expect(
      stageConversionRate(
        { stage: "inquiry", reached: 100 },
        { stage: "brief_received", reached: 40 }
      )
    ).toBeCloseTo(0.4);
  });

  it("returns null when the earlier stage is empty", () => {
    expect(
      stageConversionRate(
        { stage: "inquiry", reached: 0 },
        { stage: "brief_received", reached: 5 }
      )
    ).toBeNull();
  });

  it("returns 0 when the next stage is empty but current isn't", () => {
    expect(
      stageConversionRate(
        { stage: "inquiry", reached: 50 },
        { stage: "delivered", reached: 0 }
      )
    ).toBe(0);
  });
});

describe("FUNNEL_STAGES", () => {
  it("lists every project status in the correct order", () => {
    expect(FUNNEL_STAGES).toEqual([
      "inquiry",
      "brief_received",
      "in_progress",
      "review",
      "delivered",
    ]);
  });
});
