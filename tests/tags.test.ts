import { describe, expect, it } from "vitest";
import {
  INDUSTRY_LABELS,
  GENRE_LABELS,
  MOOD_LABELS,
  INDUSTRY_OPTIONS,
  GENRE_OPTIONS,
  MOOD_OPTIONS,
} from "@/lib/tags";

describe("tag option/label parity", () => {
  it("every option has a label entry", () => {
    for (const o of INDUSTRY_OPTIONS) expect(INDUSTRY_LABELS[o.value]).toBe(o.label);
    for (const o of GENRE_OPTIONS) expect(GENRE_LABELS[o.value]).toBe(o.label);
    for (const o of MOOD_OPTIONS) expect(MOOD_LABELS[o.value]).toBe(o.label);
  });

  it("contains expected core values", () => {
    expect(INDUSTRY_OPTIONS.map((o) => o.value)).toContain("beauty");
    expect(GENRE_OPTIONS.map((o) => o.value)).toContain("ad");
    expect(MOOD_OPTIONS.map((o) => o.value)).toContain("cold");
  });
});
