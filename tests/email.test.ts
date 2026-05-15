import { describe, it, expect, beforeEach, vi } from "vitest";

import { inquiryReceived, statusChanged, quoteReady } from "@/lib/email/templates";
import {
  notifyInquiryReceived,
  notifyStatusChanged,
  notifyQuoteReady,
} from "@/lib/email/notify";
import { _resetEmailProviderForTests, pickProvider } from "@/lib/email/provider";

describe("email/templates", () => {
  it("inquiryReceived includes model name + project title + dashboard link", () => {
    const r = inquiryReceived({
      modelName: "Luna",
      projectTitle: "여름 신상 캠페인",
      clientName: "김 PM",
      projectId: "p1",
      brief: "강한 햇빛",
    });
    expect(r.subject).toContain("Luna");
    expect(r.text).toContain("여름 신상 캠페인");
    expect(r.text).toContain("강한 햇빛");
    expect(r.html).toContain("/client/dashboard");
  });

  it("statusChanged renders Korean labels and shows transition", () => {
    const r = statusChanged({
      modelName: "Luna",
      projectTitle: "여름 캠페인",
      projectId: "p1",
      from: "brief_received",
      to: "in_progress",
    });
    expect(r.subject).toContain("제작 중");
    expect(r.text).toContain("브리프 접수 완료");
    expect(r.text).toContain("제작 중");
  });

  it("quoteReady formats KRW amount and links to /client/quote/[id]", () => {
    const r = quoteReady({
      modelName: "Luna",
      projectTitle: "여름 캠페인",
      projectId: "p1",
      amount: 2500000,
    });
    expect(r.subject).toContain("견적");
    expect(r.html).toContain("/client/quote/p1");
    expect(r.text).toContain("2,500,000");
  });

  it("escapes HTML in user-controlled fields", () => {
    const r = inquiryReceived({
      modelName: "<script>alert(1)</script>",
      projectTitle: "ok",
      projectId: "p1",
    });
    expect(r.html).not.toContain("<script>alert");
    expect(r.html).toContain("&lt;script&gt;");
  });
});

describe("email/notify", () => {
  beforeEach(() => {
    _resetEmailProviderForTests();
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
  });

  it("default provider is the log provider (no env config)", () => {
    const p = pickProvider();
    expect(p.name).toBe("log");
  });

  it("uses Resend provider when EMAIL_PROVIDER=resend and key set", () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "test_key";
    _resetEmailProviderForTests();
    const p = pickProvider();
    expect(p.name).toBe("resend");
  });

  it("falls back to log when RESEND_API_KEY is missing even if provider=resend", () => {
    process.env.EMAIL_PROVIDER = "resend";
    _resetEmailProviderForTests();
    const p = pickProvider();
    expect(p.name).toBe("log");
  });

  it("notifyStatusChanged skips no-op transitions", async () => {
    const result = await notifyStatusChanged("a@b.c", {
      modelName: "Luna",
      projectTitle: "x",
      projectId: "p1",
      from: "in_progress",
      to: "in_progress",
    });
    expect(result.skipped).toBe(true);
  });

  it("notifyInquiryReceived returns skipped when recipient missing", async () => {
    const result = await notifyInquiryReceived(null, {
      modelName: "Luna",
      projectTitle: "x",
      projectId: "p1",
    });
    expect(result.skipped).toBe(true);
  });

  it("provider failure surfaces but never throws", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "bad_key";
    _resetEmailProviderForTests();

    // Stub the network call so we don't actually hit Resend.
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("bad", { status: 401, statusText: "Unauthorized" })
    );

    try {
      const result = await notifyQuoteReady("a@b.c", {
        modelName: "Luna",
        projectTitle: "x",
        projectId: "p1",
        amount: 1000,
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("401");
    } finally {
      globalThis.fetch = original;
    }
  });
});
