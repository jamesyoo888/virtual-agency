import { describe, expect, it } from "vitest";
import { anonymize } from "@/lib/analytics/model-cases";

describe("anonymize", () => {
  it("falls back when company is missing", () => {
    expect(anonymize(null)).toBe("비공개 광고주");
    expect(anonymize(undefined)).toBe("비공개 광고주");
    expect(anonymize("")).toBe("비공개 광고주");
  });

  it("masks short names with a star marker", () => {
    expect(anonymize("A")).toBe("A*");
    expect(anonymize("AB")).toBe("A*");
  });

  it("keeps first and last char, masks middle", () => {
    expect(anonymize("Acme")).toBe("A**e");
    expect(anonymize("Goliath")).toBe("G*****h");
  });

  it("caps the mask length so very long names don't explode", () => {
    expect(anonymize("VeryLongCompanyName")).toBe("V******e");
  });

  it("trims whitespace before masking", () => {
    expect(anonymize("  Acme  ")).toBe("A**e");
  });
});
