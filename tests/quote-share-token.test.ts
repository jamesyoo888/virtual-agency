import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signQuoteToken, verifyQuoteToken } from "@/lib/quote/share-token";

const originalSecret = process.env.QUOTE_SHARE_SECRET;

beforeAll(() => {
  process.env.QUOTE_SHARE_SECRET = "test-secret-do-not-leak";
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.QUOTE_SHARE_SECRET;
  else process.env.QUOTE_SHARE_SECRET = originalSecret;
});

describe("signQuoteToken", () => {
  it("is deterministic for the same project id and secret", () => {
    const a = signQuoteToken("p-1");
    const b = signQuoteToken("p-1");
    expect(a).toBe(b);
  });

  it("yields different tokens for different project ids", () => {
    const a = signQuoteToken("p-1");
    const b = signQuoteToken("p-2");
    expect(a).not.toBe(b);
  });

  it("produces a 16-char hex token", () => {
    const t = signQuoteToken("project-abc");
    expect(t).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("verifyQuoteToken", () => {
  it("accepts a freshly signed token", () => {
    const t = signQuoteToken("p-1");
    expect(verifyQuoteToken("p-1", t)).toBe(true);
  });

  it("rejects a token bound to a different project id", () => {
    const t = signQuoteToken("p-1");
    expect(verifyQuoteToken("p-2", t)).toBe(false);
  });

  it("rejects an empty token", () => {
    expect(verifyQuoteToken("p-1", "")).toBe(false);
  });

  it("rejects a malformed token", () => {
    expect(verifyQuoteToken("p-1", "not-hex-of-16-chars")).toBe(false);
  });

  it("rejects a token with the right shape but wrong bytes", () => {
    expect(verifyQuoteToken("p-1", "0".repeat(16))).toBe(false);
  });

  it("invalidates outstanding tokens after secret rotation", () => {
    const original = process.env.QUOTE_SHARE_SECRET;
    const t = signQuoteToken("p-1");
    process.env.QUOTE_SHARE_SECRET = "rotated-secret";
    try {
      expect(verifyQuoteToken("p-1", t)).toBe(false);
    } finally {
      process.env.QUOTE_SHARE_SECRET = original;
    }
  });
});
