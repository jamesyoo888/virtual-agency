import { describe, it, expect } from "vitest";
import { inquiryCreateSchema } from "@/lib/api/schemas";

describe("inquiryCreateSchema attribution fields", () => {
  it("accepts a clean payload with no attribution", () => {
    const r = inquiryCreateSchema.safeParse({
      model_id: "m1",
      title: "Hello",
    });
    expect(r.success).toBe(true);
  });

  it("passes through utm_source, utm_medium, utm_campaign, referrer", () => {
    const r = inquiryCreateSchema.safeParse({
      model_id: "m1",
      title: "Inquiry",
      utm_source: "instagram",
      utm_medium: "ad",
      utm_campaign: "spring_2026",
      referrer: "https://referrer.example/path",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.utm_source).toBe("instagram");
      expect(r.data.utm_campaign).toBe("spring_2026");
      expect(r.data.referrer).toBe("https://referrer.example/path");
    }
  });

  it("rejects an oversized utm_source", () => {
    const r = inquiryCreateSchema.safeParse({
      model_id: "m1",
      title: "Inquiry",
      utm_source: "x".repeat(121),
    });
    expect(r.success).toBe(false);
  });

  it("accepts nulls for any attribution field", () => {
    const r = inquiryCreateSchema.safeParse({
      model_id: "m1",
      title: "Inquiry",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referrer: null,
    });
    expect(r.success).toBe(true);
  });
});
