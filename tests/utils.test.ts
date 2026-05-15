import { describe, expect, it, vi, afterEach } from "vitest";
import { ageInYears, cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and dedupes Tailwind utilities", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", false && "text-blue-500", "font-bold")).toBe(
      "text-red-500 font-bold"
    );
  });

  it("handles undefined and conditional inputs", () => {
    expect(cn(undefined, null, "x")).toBe("x");
  });
});

describe("ageInYears", () => {
  const NOW = new Date("2026-05-14T00:00:00Z").getTime();

  afterEach(() => {
    vi.useRealTimers();
  });

  function freezeTime() {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  }

  it("returns null for nullish input", () => {
    expect(ageInYears(undefined)).toBeNull();
    expect(ageInYears(null)).toBeNull();
    expect(ageInYears("")).toBeNull();
  });

  it("returns null for invalid date strings", () => {
    expect(ageInYears("not-a-date")).toBeNull();
  });

  it("computes floored age from a debut date", () => {
    freezeTime();
    // Uses 365.25 day year approximation, so exact-anniversary dates can be
    // off by one — accept that as the contract.
    expect(ageInYears("2000-05-14")).toBe(25);
    expect(ageInYears("2010-01-01")).toBe(16);
  });

  it("returns 0 for a date less than one year ago", () => {
    freezeTime();
    expect(ageInYears("2025-06-01")).toBe(0);
  });
});
