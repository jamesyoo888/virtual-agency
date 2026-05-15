import { describe, it, expect } from "vitest";
import { isBot } from "@/lib/analytics/track-view";

describe("track-view / isBot", () => {
  it("treats common bot UAs as bots", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://...)" )).toBe(true);
    expect(isBot("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/123 Safari/537.36")).toBe(true);
  });

  it("treats a missing UA as a bot (browsers always send one)", () => {
    expect(isBot(undefined)).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("")).toBe(true);
  });

  it("passes real browser UAs through as human", () => {
    expect(
      isBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
      )
    ).toBe(false);
    expect(
      isBot(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
      )
    ).toBe(false);
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15"
      )
    ).toBe(false);
  });
});
