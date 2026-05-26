import { describe, it, expect } from "vitest";
import { organizationLd } from "@/lib/seo/json-ld";

describe("organizationLd", () => {
  it("emits a valid schema.org Organization node", () => {
    const ld = organizationLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Organization");
    expect(typeof ld.name).toBe("string");
    expect(ld.name.length).toBeGreaterThan(0);
    expect(typeof ld.url).toBe("string");
    expect(ld.url.startsWith("http")).toBe(true);
  });

  it("declares both ko and en in knowsLanguage so crawlers can map the bilingual surface", () => {
    const ld = organizationLd();
    expect(ld.knowsLanguage).toEqual(expect.arrayContaining(["ko", "en"]));
  });

  it("carries an English alternateName so LLM citation surfaces the English line", () => {
    const ld = organizationLd();
    expect(typeof ld.alternateName).toBe("string");
    expect(ld.alternateName).toMatch(/Virtual Agency/);
    // Must be the brand-positioning line, not a translation of the marketing copy.
    expect(ld.alternateName).toMatch(/K-Aesthetic|AI Models/i);
  });

  it("lists the English mirror in sameAs so crawlers discover /en from any page", () => {
    const ld = organizationLd();
    const enUrl = ld.sameAs.find((u: string) => u.endsWith("/en"));
    expect(enUrl).toBeTruthy();
  });

  it("declares areaServed for global markets (KR, US, GB, EU, SG)", () => {
    const ld = organizationLd();
    expect(ld.areaServed).toEqual(
      expect.arrayContaining(["KR", "US", "GB", "EU", "SG"])
    );
  });
});
