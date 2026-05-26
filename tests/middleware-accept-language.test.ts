import { describe, it, expect } from "vitest";
import { prefersEnglish } from "@/middleware";

describe("prefersEnglish", () => {
  it("returns false for null / empty input", () => {
    expect(prefersEnglish(null)).toBe(false);
    expect(prefersEnglish("")).toBe(false);
  });

  it("returns true when en is strictly preferred over ko", () => {
    expect(prefersEnglish("en-US,en;q=0.9,ko;q=0.5")).toBe(true);
    expect(prefersEnglish("en")).toBe(true);
    expect(prefersEnglish("en-GB")).toBe(true);
  });

  it("returns false when ko is strictly preferred", () => {
    expect(prefersEnglish("ko-KR,ko;q=0.9,en;q=0.5")).toBe(false);
    expect(prefersEnglish("ko")).toBe(false);
  });

  it("returns false on a tie (defaults to staying on KO)", () => {
    expect(prefersEnglish("en-US,ko;q=1.0")).toBe(false);
    expect(prefersEnglish("en,ko")).toBe(false);
  });

  it("returns false when neither en nor ko is present (defer to KO)", () => {
    expect(prefersEnglish("ja-JP,ja;q=0.9")).toBe(false);
    expect(prefersEnglish("de-DE,de;q=0.8,fr;q=0.5")).toBe(false);
  });

  it("ignores q=0 entries (caller explicitly excluded that language)", () => {
    expect(prefersEnglish("en;q=0,ko;q=0.5")).toBe(false);
    expect(prefersEnglish("ko;q=0,en;q=0.5")).toBe(true);
  });

  it("treats malformed q values defensively (no crash, no false positive)", () => {
    expect(prefersEnglish("en;q=xx,ko;q=0.5")).toBe(false);
    expect(prefersEnglish("en;q=1.0;ko;q=0.5")).toBe(true);
  });
});
