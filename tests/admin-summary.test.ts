import { describe, it, expect } from "vitest";
import {
  formatAdminSummaryText,
  formatAdminSummaryHtml,
  type AdminWeeklySummary,
} from "@/lib/email/admin-summary";

const fixture: AdminWeeklySummary = {
  windowStart: "2026-05-14T00:00:00.000Z",
  windowEnd: "2026-05-21T00:00:00.000Z",
  inquiriesCount: 7,
  inquiriesNoFollowup: 2,
  deliveredCount: 3,
  inFlightCount: 5,
  newsletterSignups: 12,
  pendingReviews: 1,
  topSearches: [
    { q: "beauty", count: 12, avgResults: 14.2 },
    { q: "luxury", count: 5, avgResults: 6.0 },
  ],
  zeroResultSearches: [
    { q: "k-pop idol", count: 4 },
    { q: "wedding", count: 2 },
  ],
  revenue30dKrw: 23_500_000,
  atRiskCount: 3,
  atRiskLtvKrw: 18_000_000,
  retention90dPct: 0.42,
  retention90dCohortCount: 4,
  velocityMedianDays: 5.4,
  velocityP90Days: 12.1,
  velocityCount: 8,
  bottleneckStage: "in_progress",
  bottleneckMedianDays: 6.7,
};

describe("formatAdminSummaryText", () => {
  it("includes every headline metric on its own line", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/신규 문의: 7/);
    expect(out).toMatch(/팔로업 필요 \(7일 이상 stale\): 2/);
    expect(out).toMatch(/납품 완료: 3/);
    expect(out).toMatch(/진행 중 \(브리프~검토\): 5/);
    expect(out).toMatch(/뉴스레터 신규 구독: 12/);
    expect(out).toMatch(/대기 중인 리뷰 모더레이션: 1/);
    expect(out).toMatch(/₩23,500,000/);
  });

  it("includes top + zero-result search queries", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/beauty.*12.*평균 결과 14\.2/);
    expect(out).toMatch(/k-pop idol \(4회\)/);
  });

  it("omits search sections gracefully when both are empty", () => {
    const empty: AdminWeeklySummary = {
      ...fixture,
      topSearches: [],
      zeroResultSearches: [],
    };
    const out = formatAdminSummaryText(empty);
    expect(out).not.toMatch(/인기 검색어/);
    expect(out).not.toMatch(/0결과 검색어/);
  });

  it("includes at-risk and retention lines when present", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/LTV at-risk 광고주: 3건/);
    expect(out).toMatch(/누적 ₩18,000,000/);
    expect(out).toMatch(/90일 재구매율 .* 42%/);
  });

  it("hides at-risk and retention lines when no signal", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      atRiskCount: 0,
      atRiskLtvKrw: 0,
      retention90dPct: null,
      retention90dCohortCount: 0,
    };
    const out = formatAdminSummaryText(quiet);
    expect(out).not.toMatch(/LTV at-risk/);
    expect(out).not.toMatch(/90일 재구매율/);
  });

  it("includes velocity line with median + p90 + count when present", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/납품 lead time .* 중앙값 5\.4d.*p90 12\.1d.*8건/);
  });

  it("hides velocity line when count is zero", () => {
    const noVelocity: AdminWeeklySummary = {
      ...fixture,
      velocityMedianDays: null,
      velocityP90Days: null,
      velocityCount: 0,
    };
    expect(formatAdminSummaryText(noVelocity)).not.toMatch(/납품 lead time/);
  });

  it("omits p90 from velocity line when null (n<5)", () => {
    const small: AdminWeeklySummary = {
      ...fixture,
      velocityMedianDays: 6.2,
      velocityP90Days: null,
      velocityCount: 3,
    };
    const out = formatAdminSummaryText(small);
    expect(out).toMatch(/납품 lead time .* 중앙값 6\.2d · 3건/);
    expect(out).not.toMatch(/p90/);
  });

  it("includes bottleneck line with translated stage label", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/병목 단계: 제작 \(중앙값 6\.7d\)/);
  });

  it("hides bottleneck line when stage is null", () => {
    const noBottleneck: AdminWeeklySummary = {
      ...fixture,
      bottleneckStage: null,
      bottleneckMedianDays: null,
    };
    expect(formatAdminSummaryText(noBottleneck)).not.toMatch(/병목 단계/);
  });
});

describe("formatAdminSummaryHtml", () => {
  it("escapes user-supplied search strings to avoid HTML injection", () => {
    const hostile: AdminWeeklySummary = {
      ...fixture,
      topSearches: [{ q: "<img src=x onerror=alert(1)>", count: 1, avgResults: 0 }],
    };
    const html = formatAdminSummaryHtml(hostile, "https://example.com");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("includes the admin dashboard link with the configured base url", () => {
    const html = formatAdminSummaryHtml(fixture, "https://va.example.com");
    expect(html).toContain("https://va.example.com/admin");
  });

  it("renders all stat blocks", () => {
    const html = formatAdminSummaryHtml(fixture, "https://example.com");
    expect(html).toContain("신규 문의");
    expect(html).toContain("팔로업 필요");
    expect(html).toContain("30일 매출");
  });

  it("renders at-risk and retention stat blocks when populated", () => {
    const html = formatAdminSummaryHtml(fixture, "https://example.com");
    expect(html).toContain("LTV at-risk");
    expect(html).toContain("3건");
    expect(html).toContain("90일 재구매율");
    expect(html).toContain("42%");
  });

  it("hides at-risk and retention blocks when signal absent", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      atRiskCount: 0,
      atRiskLtvKrw: 0,
      retention90dPct: null,
      retention90dCohortCount: 0,
    };
    const html = formatAdminSummaryHtml(quiet, "https://example.com");
    expect(html).not.toContain("LTV at-risk");
    expect(html).not.toContain("90일 재구매율");
  });

  it("renders velocity stat block when populated", () => {
    const html = formatAdminSummaryHtml(fixture, "https://example.com");
    expect(html).toContain("납품 lead time");
    expect(html).toContain("5.4d");
  });

  it("hides velocity stat when count is zero", () => {
    const html = formatAdminSummaryHtml(
      {
        ...fixture,
        velocityMedianDays: null,
        velocityP90Days: null,
        velocityCount: 0,
      },
      "https://example.com"
    );
    expect(html).not.toContain("납품 lead time");
  });

  it("renders bottleneck stat block with translated label", () => {
    const html = formatAdminSummaryHtml(fixture, "https://example.com");
    expect(html).toContain("병목 단계");
    expect(html).toContain("제작 6.7d");
  });

  it("hides bottleneck stat when stage is null", () => {
    const html = formatAdminSummaryHtml(
      {
        ...fixture,
        bottleneckStage: null,
        bottleneckMedianDays: null,
      },
      "https://example.com"
    );
    expect(html).not.toContain("병목 단계");
  });
});
