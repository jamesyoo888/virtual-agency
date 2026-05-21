import { describe, it, expect } from "vitest";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/newsletter/unsubscribe-token";

describe("newsletter unsubscribe tokens", () => {
  it("verifies its own signature", () => {
    const t = signUnsubscribeToken("Hi@Brand.com");
    expect(verifyUnsubscribeToken("hi@brand.com", t)).toBe(true);
  });

  it("normalizes case so the email matches regardless of input casing", () => {
    const t = signUnsubscribeToken("a@b.com");
    expect(verifyUnsubscribeToken("A@B.COM", t)).toBe(true);
  });

  it("rejects a token bound to a different address", () => {
    const t = signUnsubscribeToken("a@b.com");
    expect(verifyUnsubscribeToken("c@d.com", t)).toBe(false);
  });

  it("rejects empty / malformed tokens", () => {
    expect(verifyUnsubscribeToken("a@b.com", "")).toBe(false);
    expect(verifyUnsubscribeToken("a@b.com", "deadbeef")).toBe(false);
  });

  it("is deterministic for the same secret + email", () => {
    expect(signUnsubscribeToken("a@b.com")).toEqual(signUnsubscribeToken("a@b.com"));
  });
});
