import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  signReferralToken,
  verifyReferralToken,
} from "@/lib/referral/token";

const original = process.env.REFERRAL_SECRET;

beforeAll(() => {
  process.env.REFERRAL_SECRET = "test-referral-secret";
});

afterAll(() => {
  if (original === undefined) delete process.env.REFERRAL_SECRET;
  else process.env.REFERRAL_SECRET = original;
});

describe("signReferralToken", () => {
  it("produces a 12-char hex token", () => {
    const t = signReferralToken("user-1");
    expect(t).toMatch(/^[0-9a-f]{12}$/);
  });

  it("is deterministic for the same code", () => {
    expect(signReferralToken("user-1")).toBe(signReferralToken("user-1"));
  });

  it("differs for different codes", () => {
    expect(signReferralToken("user-1")).not.toBe(signReferralToken("user-2"));
  });
});

describe("verifyReferralToken", () => {
  it("accepts a freshly signed token", () => {
    const t = signReferralToken("u-1");
    expect(verifyReferralToken("u-1", t)).toBe(true);
  });

  it("rejects a token for a different code", () => {
    const t = signReferralToken("u-1");
    expect(verifyReferralToken("u-2", t)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyReferralToken("u-1", "")).toBe(false);
    expect(verifyReferralToken("u-1", "0".repeat(12))).toBe(false);
    expect(verifyReferralToken("u-1", "not-the-right-length")).toBe(false);
  });

  it("invalidates after secret rotation", () => {
    const t = signReferralToken("u-1");
    const prev = process.env.REFERRAL_SECRET;
    process.env.REFERRAL_SECRET = "rotated-secret";
    try {
      expect(verifyReferralToken("u-1", t)).toBe(false);
    } finally {
      process.env.REFERRAL_SECRET = prev;
    }
  });
});
