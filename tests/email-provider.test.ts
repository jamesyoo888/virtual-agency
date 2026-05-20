import { afterEach, describe, expect, it, vi } from "vitest";
import { pickProvider, _resetEmailProviderForTests } from "@/lib/email/provider";

afterEach(() => {
  _resetEmailProviderForTests();
  delete process.env.EMAIL_PROVIDER;
  delete process.env.RESEND_API_KEY;
  vi.restoreAllMocks();
});

describe("pickProvider", () => {
  it("falls back to LogProvider with no key", () => {
    const p = pickProvider();
    expect(p.name).toBe("log");
  });

  it("activates Resend when RESEND_API_KEY is set, even without EMAIL_PROVIDER", () => {
    process.env.RESEND_API_KEY = "re_test";
    const p = pickProvider();
    expect(p.name).toBe("resend");
  });

  it("honors EMAIL_PROVIDER=log as a dry-run escape even with key set", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_PROVIDER = "log";
    const p = pickProvider();
    expect(p.name).toBe("log");
  });
});
