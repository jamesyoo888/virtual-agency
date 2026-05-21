import { describe, it, expect } from "vitest";
import { scoreModels } from "@/lib/analytics/model-performance";

describe("scoreModels", () => {
  it("returns rows sorted by smoothed inquiry rate desc", () => {
    const out = scoreModels([
      { modelId: "a", name: "A", status: "active", conceptImage: null, views: 1000, inquiries: 5, delivered: 1 },
      { modelId: "b", name: "B", status: "active", conceptImage: null, views: 1000, inquiries: 50, delivered: 10 },
      { modelId: "c", name: "C", status: "active", conceptImage: null, views: 1000, inquiries: 0, delivered: 0 },
    ]);
    expect(out.map((r) => r.modelId)).toEqual(["b", "a", "c"]);
  });

  it("smoothing prior keeps zero-view models near the catalog baseline", () => {
    const [row] = scoreModels([
      { modelId: "fresh", name: "F", status: "active", conceptImage: null, views: 0, inquiries: 0, delivered: 0 },
    ]);
    // Prior is ~3% — verify we're in that ballpark, not 0%.
    expect(row.inquiryRate).toBeGreaterThan(0.02);
    expect(row.inquiryRate).toBeLessThan(0.04);
  });

  it("smoothing penalizes models with views but no inquiries", () => {
    const out = scoreModels([
      { modelId: "viewed-no-inq", name: "X", status: "active", conceptImage: null, views: 500, inquiries: 0, delivered: 0 },
      { modelId: "viewed-with-inq", name: "Y", status: "active", conceptImage: null, views: 500, inquiries: 5, delivered: 1 },
    ]);
    const x = out.find((r) => r.modelId === "viewed-no-inq")!;
    const y = out.find((r) => r.modelId === "viewed-with-inq")!;
    expect(y.inquiryRate).toBeGreaterThan(x.inquiryRate);
    expect(x.inquiryRate).toBeLessThan(PRIOR_BASELINE_RATE);
  });

  it("closeRate is null when no inquiries, ratio otherwise", () => {
    const out = scoreModels([
      { modelId: "none", name: "N", status: "active", conceptImage: null, views: 10, inquiries: 0, delivered: 0 },
      { modelId: "half", name: "H", status: "active", conceptImage: null, views: 10, inquiries: 4, delivered: 2 },
    ]);
    expect(out.find((r) => r.modelId === "none")!.closeRate).toBeNull();
    expect(out.find((r) => r.modelId === "half")!.closeRate).toBe(0.5);
  });
});

const PRIOR_BASELINE_RATE = 0.03;
