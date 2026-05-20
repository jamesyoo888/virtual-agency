import { describe, expect, it } from "vitest";
import {
  classifyDevice,
  classifyVisitor,
  parseViewerCreatedAt,
} from "@/lib/analytics/classify";

describe("parseViewerCreatedAt", () => {
  it("returns null for missing or malformed cookies", () => {
    expect(parseViewerCreatedAt(null)).toBeNull();
    expect(parseViewerCreatedAt(undefined)).toBeNull();
    expect(parseViewerCreatedAt("")).toBeNull();
    expect(parseViewerCreatedAt("short")).toBeNull();
    // 8 chars of garbage + invalid base36
    expect(parseViewerCreatedAt("aaaaaaaaXYZ!@#")).toBeNull();
  });

  it("recovers the timestamp encoded in the proxy cookie format", () => {
    const random = "abcdefgh";
    const stamp = Date.now();
    const cookie = random + stamp.toString(36);
    const parsed = parseViewerCreatedAt(cookie);
    expect(parsed).toBe(stamp);
  });

  it("rejects implausibly old or future timestamps", () => {
    const ancient = "abcdefgh" + (1_000).toString(36); // 1970-ish
    expect(parseViewerCreatedAt(ancient)).toBeNull();
    const future = "abcdefgh" + (Date.now() + 60 * 60 * 1000).toString(36);
    expect(parseViewerCreatedAt(future)).toBeNull();
  });
});

describe("classifyVisitor", () => {
  it("treats freshly minted cookies as new", () => {
    const cookie = "abcdefgh" + Date.now().toString(36);
    expect(classifyVisitor(cookie)).toBe("new");
  });

  it("treats cookies older than 24h as returning", () => {
    const old = Date.now() - 48 * 60 * 60 * 1000;
    const cookie = "abcdefgh" + old.toString(36);
    expect(classifyVisitor(cookie)).toBe("returning");
  });

  it("returns unknown when the cookie is missing/garbled", () => {
    expect(classifyVisitor(null)).toBe("unknown");
    expect(classifyVisitor("garbage")).toBe("unknown");
  });
});

describe("classifyDevice", () => {
  it("identifies mobile user agents", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15"
      )
    ).toBe("mobile");
    expect(
      classifyDevice(
        "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Mobile"
      )
    ).toBe("mobile");
  });

  it("identifies tablets distinctly from phones", () => {
    expect(
      classifyDevice("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)")
    ).toBe("tablet");
    expect(
      classifyDevice("Mozilla/5.0 (Linux; Android 11; Tab S7) AppleWebKit")
    ).toBe("tablet");
  });

  it("identifies desktop by default", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36"
      )
    ).toBe("desktop");
    expect(
      classifyDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101"
      )
    ).toBe("desktop");
  });

  it("returns unknown when the user-agent is missing", () => {
    expect(classifyDevice(null)).toBe("unknown");
    expect(classifyDevice(undefined)).toBe("unknown");
  });
});
