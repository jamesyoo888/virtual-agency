import { describe, it, expect } from "vitest";
import {
  parseBlogReferrer,
  aggregateBlogAttribution,
} from "@/lib/analytics/blog-attribution";

describe("parseBlogReferrer", () => {
  it("returns null for null/empty input", () => {
    expect(parseBlogReferrer(null)).toBeNull();
    expect(parseBlogReferrer("")).toBeNull();
  });

  it("returns null for non-blog paths", () => {
    expect(parseBlogReferrer("https://aihubs.uk/pricing")).toBeNull();
    expect(parseBlogReferrer("/character/yuna")).toBeNull();
  });

  it("parses KR blog absolute URL", () => {
    expect(
      parseBlogReferrer("https://aihubs.uk/blog/how-to-brief-an-ai-model")
    ).toEqual({ slug: "how-to-brief-an-ai-model", locale: "ko" });
  });

  it("parses EN blog absolute URL", () => {
    expect(
      parseBlogReferrer(
        "https://aihubs.uk/en/blog/rfp-brief-checklist-k-aesthetic-campaign"
      )
    ).toEqual({
      slug: "rfp-brief-checklist-k-aesthetic-campaign",
      locale: "en",
    });
  });

  it("parses relative paths", () => {
    expect(parseBlogReferrer("/blog/some-post")).toEqual({
      slug: "some-post",
      locale: "ko",
    });
    expect(parseBlogReferrer("/en/blog/another-post")).toEqual({
      slug: "another-post",
      locale: "en",
    });
  });

  it("strips query + hash from path before matching", () => {
    expect(
      parseBlogReferrer("https://aihubs.uk/blog/x?utm_source=twitter#section-3")
    ).toEqual({ slug: "x", locale: "ko" });
  });
});

describe("aggregateBlogAttribution", () => {
  it("returns zero totals on empty input", () => {
    const out = aggregateBlogAttribution([], 90);
    expect(out.totalInquiries).toBe(0);
    expect(out.bySlug).toEqual([]);
  });

  it("ignores rows without a blog referrer", () => {
    const rows = [
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: "https://aihubs.uk/match",
      },
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: null,
      },
    ];
    const out = aggregateBlogAttribution(rows, 90);
    expect(out.totalInquiries).toBe(0);
  });

  it("aggregates inquiries + delivered + revenue per slug", () => {
    const rows = [
      {
        status: "inquiry",
        invoice_amount: 0,
        referrer: "/blog/a",
      },
      {
        status: "delivered",
        invoice_amount: 2_000_000,
        referrer: "/blog/a",
      },
      {
        status: "delivered",
        invoice_amount: 500_000,
        referrer: "/en/blog/a", // different locale, separate bucket
      },
      {
        status: "delivered",
        invoice_amount: 1_500_000,
        referrer: "/blog/b",
      },
    ];
    const out = aggregateBlogAttribution(rows, 90);
    expect(out.totalInquiries).toBe(4);
    expect(out.totalDelivered).toBe(3);
    expect(out.totalRevenue).toBe(4_000_000);

    const ko_a = out.bySlug.find((s) => s.slug === "a" && s.locale === "ko");
    expect(ko_a).toMatchObject({
      inquiries: 2,
      delivered: 1,
      revenue: 2_000_000,
      conversionPct: 50,
    });
    const en_a = out.bySlug.find((s) => s.slug === "a" && s.locale === "en");
    expect(en_a).toMatchObject({
      inquiries: 1,
      delivered: 1,
      revenue: 500_000,
      conversionPct: 100,
    });
  });

  it("sorts by revenue desc, ties broken by inquiry count", () => {
    const rows = [
      // High inquiries, no revenue.
      { status: "inquiry", invoice_amount: 0, referrer: "/blog/c" },
      { status: "inquiry", invoice_amount: 0, referrer: "/blog/c" },
      { status: "inquiry", invoice_amount: 0, referrer: "/blog/c" },
      // Low inquiries, high revenue.
      {
        status: "delivered",
        invoice_amount: 10_000_000,
        referrer: "/blog/a",
      },
      // Mid revenue.
      {
        status: "delivered",
        invoice_amount: 2_000_000,
        referrer: "/blog/b",
      },
    ];
    const out = aggregateBlogAttribution(rows, 90);
    expect(out.bySlug.map((s) => s.slug)).toEqual(["a", "b", "c"]);
  });

  it("coerces string invoice_amount safely", () => {
    const rows = [
      {
        status: "delivered",
        invoice_amount: "1500000.50",
        referrer: "/blog/a",
      },
    ];
    const out = aggregateBlogAttribution(rows, 90);
    expect(out.totalRevenue).toBeCloseTo(1500000.5);
  });
});
