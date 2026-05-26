import { describe, it, expect, beforeEach } from "vitest";
import {
  notifyInquiryReceived,
  notifyStatusChanged,
  notifyQuoteReady,
  notifyReferralThanks,
  notifyInquiryFollowup,
  notifyWeeklyDigest,
} from "@/lib/email/notify";
import { _resetEmailProviderForTests } from "@/lib/email/provider";
import {
  inquiryReceivedEn,
  statusChangedEn,
  quoteReadyEn,
  inquiryFollowupEn,
  weeklyDigestEn,
  referralThanksEn,
} from "@/lib/email/templates-en";

/**
 * Locale dispatch tests. The notify* wrappers route to templates-en.ts when
 * locale='en' and fall through to templates.ts otherwise. The log provider
 * (default in tests, no env config) prints the subject to console.info — we
 * use that to verify the dispatch picked the right template.
 *
 * Body-level rendering is covered by direct renderer tests (templates-en).
 */
describe("email/notify — locale dispatch (subject-level)", () => {
  beforeEach(() => {
    _resetEmailProviderForTests();
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
  });

  function captureSubjects<T>(run: () => Promise<T>): Promise<string[]> {
    const subjects: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      subjects.push(args.map((a) => String(a)).join(" "));
    };
    return run()
      .then(() => subjects)
      .finally(() => {
        console.info = original;
      });
  }

  it("notifyInquiryReceived(locale='en') logs the English subject", async () => {
    const subjects = await captureSubjects(() =>
      notifyInquiryReceived(
        "test@example.com",
        {
          modelName: "Yuna",
          projectTitle: "Spring drop",
          projectId: "p1",
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    expect(joined).toMatch(/We received your inquiry/);
    expect(joined).not.toMatch(/문의 접수/);
  });

  it("notifyInquiryReceived defaults to Korean when locale omitted", async () => {
    const subjects = await captureSubjects(() =>
      notifyInquiryReceived("test@example.com", {
        modelName: "Yuna",
        projectTitle: "봄 신상",
        projectId: "p1",
      })
    );
    const joined = subjects.join("\n");
    // Korean inquiryReceived subject contains the Korean phrase for "inquiry"
    expect(joined).toMatch(/문의/);
  });

  it("notifyStatusChanged(locale='en') logs the English status label in the subject", async () => {
    const subjects = await captureSubjects(() =>
      notifyStatusChanged(
        "test@example.com",
        {
          modelName: "Yuna",
          projectTitle: "Spring",
          projectId: "p1",
          from: "brief_received",
          to: "in_progress",
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    expect(joined).toMatch(/In production/);
    expect(joined).not.toMatch(/제작 중/);
  });

  it("notifyStatusChanged still skips no-op transitions in either locale", async () => {
    const r = await notifyStatusChanged(
      "a@b.c",
      {
        modelName: "Luna",
        projectTitle: "x",
        projectId: "p1",
        from: "in_progress",
        to: "in_progress",
      },
      "en"
    );
    expect(r.skipped).toBe(true);
  });

  it("notifyQuoteReady(locale='en') logs the English quote subject", async () => {
    const subjects = await captureSubjects(() =>
      notifyQuoteReady(
        "test@example.com",
        {
          modelName: "Yuna",
          projectTitle: "Spring",
          projectId: "p1",
          amount: 0,
          amountCents: 500000,
          currency: "USD",
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    expect(joined).toMatch(/Your quote for Yuna is ready/);
  });

  it("notifyQuoteReady(locale='en') falls back to KO when EN fields missing", async () => {
    const subjects = await captureSubjects(() =>
      notifyQuoteReady(
        "test@example.com",
        {
          modelName: "Yuna",
          projectTitle: "x",
          projectId: "p1",
          amount: 2_500_000,
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    // KR template subject contains the Korean word for "quote"
    expect(joined).toMatch(/견적/);
  });

  it("notifyReferralThanks(locale='en') logs the English referral subject", async () => {
    const subjects = await captureSubjects(() =>
      notifyReferralThanks(
        "test@example.com",
        {
          clientName: "Test",
          refereeCompany: "ACME",
          referrerId: "r1",
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    expect(joined).toMatch(/referred client just submitted/i);
  });

  it("notifyInquiryFollowup(locale='en') logs the English follow-up subject", async () => {
    const subjects = await captureSubjects(() =>
      notifyInquiryFollowup(
        "test@example.com",
        {
          clientName: "Test",
          modelName: "Yuna",
          projectTitle: "x",
          projectId: "p1",
          daysSinceInquiry: 7,
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    expect(joined).toMatch(/Checking in on your inquiry/);
  });

  it("notifyWeeklyDigest(locale='en') logs the English weekly summary subject", async () => {
    const subjects = await captureSubjects(() =>
      notifyWeeklyDigest(
        "test@example.com",
        {
          clientId: "c1",
          clientName: "Test",
          active: [
            {
              id: "p1",
              title: "Spring drop",
              status_ko: "제작 중",
              status_en: "In production",
              modelName: "Yuna",
              isRecent: true,
            },
          ],
          recentChangesCount: 1,
          deliveredCount: 0,
        },
        "en"
      )
    );
    const joined = subjects.join("\n");
    expect(joined).toMatch(/Weekly summary/);
  });
});

describe("email/templates-en — body content (locale-aware fields)", () => {
  it("inquiryReceivedEn body shows English greeting + dashboard URL", () => {
    const r = inquiryReceivedEn({
      modelName: "Yuna",
      projectTitle: "Spring",
      projectId: "p1",
      clientName: "Test",
    });
    expect(r.html).toMatch(/Hi Test/);
    expect(r.text).toMatch(/Thanks for your inquiry about Yuna/);
    expect(r.html).toContain("/client/dashboard");
  });

  it("statusChangedEn body uses English status labels and note", () => {
    const r = statusChangedEn({
      modelName: "Yuna",
      projectTitle: "Spring",
      projectId: "p1",
      from: "brief_received",
      to: "in_progress",
    });
    expect(r.text).toMatch(/Brief received/);
    expect(r.text).toMatch(/In production/);
    expect(r.text).toMatch(/Production is underway/);
  });

  it("quoteReadyEn formats USD amount with two decimal places", () => {
    const r = quoteReadyEn({
      modelName: "Yuna",
      projectTitle: "x",
      projectId: "p1",
      amountCents: 500000,
      currency: "USD",
    });
    expect(r.text).toMatch(/\$5,000\.00/);
  });

  it("quoteReadyEn formats EUR amount with euro symbol", () => {
    const r = quoteReadyEn({
      modelName: "Yuna",
      projectTitle: "x",
      projectId: "p1",
      amountCents: 1234500,
      currency: "EUR",
    });
    expect(r.text).toMatch(/€/);
    expect(r.text).toMatch(/12,345\.00/);
  });

  it("inquiryFollowupEn includes day count and CTA link", () => {
    const r = inquiryFollowupEn({
      modelName: "Yuna",
      projectTitle: "Spring",
      projectId: "p1",
      daysSinceInquiry: 7,
      clientName: "Test",
    });
    expect(r.text).toMatch(/7 days ago/);
    expect(r.html).toContain("/client/dashboard");
  });

  it("weeklyDigestEn shows the status_en label in the active list", () => {
    const r = weeklyDigestEn({
      clientName: "Test",
      active: [
        {
          id: "p1",
          title: "Spring drop",
          status_en: "In production",
          modelName: "Yuna",
          isRecent: true,
        },
      ],
      recentChangesCount: 1,
      deliveredCount: 0,
    });
    expect(r.text).toMatch(/Spring drop/);
    expect(r.text).toMatch(/In production/);
    expect(r.html).toMatch(/In production/);
  });

  it("weeklyDigestEn empty active list shows the no-projects line", () => {
    const r = weeklyDigestEn({
      active: [],
      recentChangesCount: 0,
      deliveredCount: 5,
    });
    expect(r.html).toMatch(/no active projects/i);
  });

  it("referralThanksEn body names the refereeCompany when supplied", () => {
    const r = referralThanksEn({
      clientName: "Test",
      refereeCompany: "ACME Beauty",
    });
    expect(r.text).toMatch(/ACME Beauty just submitted their first inquiry/);
  });

  it("referralThanksEn body falls back to generic phrasing when no company", () => {
    const r = referralThanksEn({
      clientName: null,
      refereeCompany: null,
    });
    expect(r.text).toMatch(/Your referred client just submitted/);
  });
});
