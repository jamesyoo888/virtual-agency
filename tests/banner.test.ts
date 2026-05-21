import { describe, it, expect } from "vitest";
import { bannerPatchSchema } from "@/lib/api/schemas";

describe("bannerPatchSchema", () => {
  it("accepts a minimal payload", () => {
    const r = bannerPatchSchema.safeParse({ text: "5월 한정 30% 할인" });
    expect(r.success).toBe(true);
  });

  it("accepts a fully-loaded payload", () => {
    const r = bannerPatchSchema.safeParse({
      text: "프로모션",
      href: "/pricing",
      tone: "promo",
    });
    expect(r.success).toBe(true);
  });

  it("accepts empty text (used to clear the banner)", () => {
    const r = bannerPatchSchema.safeParse({ text: "" });
    expect(r.success).toBe(true);
  });

  it("rejects unknown tone", () => {
    const r = bannerPatchSchema.safeParse({ text: "hi", tone: "alert" });
    expect(r.success).toBe(false);
  });

  it("caps text at 280 chars", () => {
    const r = bannerPatchSchema.safeParse({ text: "a".repeat(281) });
    expect(r.success).toBe(false);
  });
});
