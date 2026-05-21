import { describe, it, expect } from "vitest";
import { newsletterSignupSchema } from "@/lib/api/schemas";

describe("newsletterSignupSchema", () => {
  it("accepts a clean email", () => {
    const r = newsletterSignupSchema.safeParse({ email: "Hi@Brand.com" });
    expect(r.success).toBe(true);
  });

  it("rejects malformed email", () => {
    const r = newsletterSignupSchema.safeParse({ email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("accepts optional source + utm fields", () => {
    const r = newsletterSignupSchema.safeParse({
      email: "ok@brand.com",
      source: "footer",
      utm_source: "twitter",
      utm_medium: "social",
      utm_campaign: "may26",
    });
    expect(r.success).toBe(true);
  });

  it("caps email length at 254", () => {
    const long = "a".repeat(250) + "@b.com";
    const r = newsletterSignupSchema.safeParse({ email: long });
    expect(r.success).toBe(false);
  });
});
