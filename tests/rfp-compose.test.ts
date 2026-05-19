import { describe, it, expect } from "vitest";

import { composeRfpBrief, budgetBandToRange } from "@/lib/rfp/compose";

describe("composeRfpBrief", () => {
  it("starts with the RFP marker line so admin operators can spot the origin", () => {
    const out = composeRfpBrief({ campaign: "2026 FW" });
    expect(out.startsWith("[RFP 기반 추천 문의]")).toBe(true);
  });

  it("only includes lines for fields that were filled in", () => {
    const out = composeRfpBrief({ campaign: "X" });
    expect(out).toContain("캠페인: X");
    expect(out).not.toContain("광고주");
    expect(out).not.toContain("타깃");
    expect(out).not.toContain("일정");
  });

  it("translates known channel codes to their Korean labels", () => {
    const out = composeRfpBrief({
      channels: ["tvc", "digital", "unknown_code"],
    });
    expect(out).toMatch(/매체: TVC, 디지털\/SNS, unknown_code/);
  });

  it("merges launch date and duration into a single 일정 line", () => {
    const out = composeRfpBrief({ launch: "2026-07-01", durationDays: "14" });
    expect(out).toMatch(/일정: 런칭 2026-07-01, 14일 운영/);
  });

  it("notes exclusive license when requested", () => {
    const out = composeRfpBrief({ needsExclusive: true, budgetPerDay: 800000 });
    expect(out).toContain("독점 라이선스 요청");
    expect(out).toContain("일 단가 상한 ₩800,000");
  });

  it("formats budget per day in Korean locale", () => {
    const out = composeRfpBrief({ budgetPerDay: 1234567 });
    expect(out).toContain("₩1,234,567");
  });

  it("includes the message and hero copy on their own labelled blocks", () => {
    const out = composeRfpBrief({
      message: "산뜻한 봄 메시지",
      heroCopy: "다시, 봄.",
    });
    expect(out).toContain("핵심 메시지\n산뜻한 봄 메시지");
    expect(out).toContain("히어로 카피\n다시, 봄.");
  });

  it("collapses to just the marker when no fields are filled", () => {
    expect(composeRfpBrief({})).toBe("[RFP 기반 추천 문의]");
  });
});

describe("budgetBandToRange", () => {
  it("returns known bands verbatim (they share the option value)", () => {
    expect(budgetBandToRange("under_500")).toBe("under_500");
    expect(budgetBandToRange("over_3000")).toBe("over_3000");
  });

  it("falls back to empty for unknown / missing bands", () => {
    expect(budgetBandToRange(undefined)).toBe("");
    expect(budgetBandToRange("")).toBe("");
    expect(budgetBandToRange("nope")).toBe("");
  });
});
