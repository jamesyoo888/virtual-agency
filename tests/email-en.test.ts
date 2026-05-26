import { describe, it, expect } from "vitest";
import {
  inquiryReceivedEn,
  statusChangedEn,
  quoteReadyEn,
  inquiryFollowupEn,
  weeklyDigestEn,
} from "@/lib/email/templates-en";

describe("email/templates-en", () => {
  it("inquiryReceivedEn includes English greeting + model name + dashboard link", () => {
    const r = inquiryReceivedEn({
      modelName: "Luna",
      projectTitle: "Summer launch",
      clientName: "Alex",
      projectId: "p1",
      brief: "Soft skin, sage palette",
    });
    expect(r.subject).toContain("Luna");
    expect(r.subject).toContain("Virtual Agency");
    expect(r.text).toContain("Hi Alex,");
    expect(r.text).toContain("Summer launch");
    expect(r.text).toContain("Soft skin, sage palette");
    expect(r.html).toContain("/client/dashboard");
  });

  it("falls back to a neutral greeting when clientName is missing", () => {
    const r = inquiryReceivedEn({
      modelName: "Luna",
      projectTitle: "Summer launch",
      projectId: "p1",
    });
    expect(r.text.startsWith("Hello,")).toBe(true);
  });

  it("statusChangedEn renders English status labels and shows transition", () => {
    const r = statusChangedEn({
      modelName: "Luna",
      projectTitle: "Summer launch",
      projectId: "p1",
      from: "brief_received",
      to: "in_progress",
    });
    expect(r.subject).toContain("In production");
    expect(r.text).toContain("Brief received");
    expect(r.text).toContain("In production");
  });

  it("quoteReadyEn formats USD with two decimals and links to /client/quote/[id]", () => {
    const r = quoteReadyEn({
      modelName: "Luna",
      projectTitle: "Launch",
      projectId: "p1",
      amountCents: 550000,
      currency: "USD",
    });
    expect(r.subject).toContain("quote");
    expect(r.html).toContain("/client/quote/p1");
    expect(r.text).toMatch(/\$5,500\.00/);
  });

  it("quoteReadyEn handles EUR currency", () => {
    const r = quoteReadyEn({
      modelName: "Luna",
      projectTitle: "Launch",
      projectId: "p1",
      amountCents: 550000,
      currency: "EUR",
    });
    // Intl format for en-IE uses "€" prefix; we just assert symbol + magnitude.
    expect(r.text).toContain("€");
    expect(r.text).toContain("5,500");
  });

  it("inquiryFollowupEn surfaces the days-since count", () => {
    const r = inquiryFollowupEn({
      modelName: "Luna",
      projectTitle: "Launch",
      projectId: "p1",
      daysSinceInquiry: 7,
    });
    expect(r.text).toContain("7 days ago");
    expect(r.html).toContain("/client/dashboard");
  });

  it("weeklyDigestEn pluralises 'project' and lists each active project", () => {
    const r1 = weeklyDigestEn({
      active: [
        { id: "p1", title: "Spring", status_en: "In production", modelName: "Luna", isRecent: true },
      ],
      recentChangesCount: 1,
      deliveredCount: 0,
    });
    expect(r1.subject).toContain("1 active project");
    expect(r1.text).toContain("Spring");

    const r2 = weeklyDigestEn({
      active: [],
      recentChangesCount: 0,
      deliveredCount: 0,
    });
    expect(r2.subject).toContain("0 active projects");
    expect(r2.text).toContain("no active projects");
  });

  it("english templates link to /en/legal/ai-disclosure in the footer", () => {
    const r = inquiryReceivedEn({
      modelName: "Luna",
      projectTitle: "Launch",
      projectId: "p1",
    });
    expect(r.html).toContain("/en/legal/ai-disclosure");
  });
});
