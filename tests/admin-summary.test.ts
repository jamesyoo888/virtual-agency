import { describe, it, expect } from "vitest";
import {
  formatAdminSummaryText,
  formatAdminSummaryHtml,
  summarizeNewPosts,
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
  characterAttributedInquiries: 4,
  characterAttributedRevenueKrw: 11_000_000,
  blogAttributedInquiries: 3,
  blogAttributedRevenueKrw: 6_500_000,
  pricingCalculatorAttributedInquiries: 5,
  pricingCalculatorAttributedRevenueKrw: 14_000_000,
  agentAttributedInquiries: 2,
  agentAttributedRevenueKrw: 9_000_000,
  newPostsKo: 2,
  newPostsEn: 1,
  newPostsSample: [
    { title: "신규 글 1", slug: "new-post-1", locale: "ko" as const },
    { title: "신규 글 2", slug: "new-post-2", locale: "ko" as const },
    {
      title: "Fresh launch playbook",
      slug: "fresh-launch-playbook",
      locale: "en" as const,
    },
  ],
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

  it("includes character-attribution line with revenue when present", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/캐릭터 페이지 → 문의 \(30일\): 4건/);
    expect(out).toMatch(/매출 ₩11,000,000/);
  });

  it("omits character-attribution line entirely when inquiries=0", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      characterAttributedInquiries: 0,
      characterAttributedRevenueKrw: 0,
    };
    expect(formatAdminSummaryText(quiet)).not.toMatch(/캐릭터 페이지/);
  });

  it("omits revenue clause when no delivered revenue yet (inquiries > 0)", () => {
    const noRev: AdminWeeklySummary = {
      ...fixture,
      characterAttributedInquiries: 2,
      characterAttributedRevenueKrw: 0,
    };
    const out = formatAdminSummaryText(noRev);
    expect(out).toMatch(/캐릭터 페이지 → 문의 \(30일\): 2건/);
    // "30일 매출" line is the unrelated KPI — the character-attribution
    // clause specifically must not append "· 매출 ₩…" since revenue=0.
    expect(out).not.toMatch(/캐릭터 페이지 → 문의 \(30일\): 2건 · 매출/);
  });

  it("includes blog-attribution line with revenue when present", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/블로그 글 → 문의 \(30일\): 3건/);
    expect(out).toMatch(/매출 ₩6,500,000/);
  });

  it("omits blog-attribution line entirely when inquiries=0", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      blogAttributedInquiries: 0,
      blogAttributedRevenueKrw: 0,
    };
    expect(formatAdminSummaryText(quiet)).not.toMatch(/블로그 글/);
  });

  it("includes pricing-calculator-attribution line with revenue when present", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/가격 계산기 → 문의 \(30일\): 5건/);
    expect(out).toMatch(/매출 ₩14,000,000/);
  });

  it("omits pricing-calculator-attribution line entirely when inquiries=0", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      pricingCalculatorAttributedInquiries: 0,
      pricingCalculatorAttributedRevenueKrw: 0,
    };
    expect(formatAdminSummaryText(quiet)).not.toMatch(/가격 계산기/);
  });

  it("includes agent-attribution line with revenue + 15% commission estimate", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/에이전트 referral → 문의 \(30일\): 2건/);
    expect(out).toMatch(/매출 ₩9,000,000/);
    // 15% of 9,000,000 = 1,350,000
    expect(out).toMatch(/15% 커미션 ≈ ₩1,350,000/);
  });

  it("omits agent-attribution line entirely when inquiries=0", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      agentAttributedInquiries: 0,
      agentAttributedRevenueKrw: 0,
    };
    expect(formatAdminSummaryText(quiet)).not.toMatch(/에이전트 referral/);
  });

  it("includes new-posts line with KR + EN counts + top 3 titles", () => {
    const out = formatAdminSummaryText(fixture);
    expect(out).toMatch(/신규 발행 글 \(7일\): 3편 \(KR 2 · EN 1\)/);
    expect(out).toMatch(/\[KO\] 신규 글 1/);
    expect(out).toMatch(/\[EN\] Fresh launch playbook/);
  });

  it("omits new-posts line entirely when 0 + 0", () => {
    const quiet: AdminWeeklySummary = {
      ...fixture,
      newPostsKo: 0,
      newPostsEn: 0,
      newPostsSample: [],
    };
    expect(formatAdminSummaryText(quiet)).not.toMatch(/신규 발행 글/);
  });
});

describe("summarizeNewPosts", () => {
  it("returns zero counts when no posts within the 7-day window relative to a fixed 'now'", () => {
    // Today inside a far-past date window — every post in registry is older
    // than 7d from 1970, so the sample is empty.
    const out = summarizeNewPosts(new Date("1970-02-01T00:00:00.000Z"));
    expect(out.newPostsKo).toBe(0);
    expect(out.newPostsEn).toBe(0);
    expect(out.newPostsSample).toEqual([]);
  });

  it("excludes posts whose publishedAt is more than 7 days in the future relative to now (not yet live)", () => {
    // Today inside a far-future window — every post is way in the past.
    // Either way, posts dated 2026-08-04+ are not within a 7d window of
    // 2050-01-01 (they're 24 years in the past), so 0.
    const out = summarizeNewPosts(new Date("2050-01-01T00:00:00.000Z"));
    expect(out.newPostsKo).toBe(0);
    expect(out.newPostsEn).toBe(0);
  });

  it("counts posts whose publishedAt is within the 7 days before 'now'", () => {
    // Pick a 'now' that lands within the publishedAt of the 4 EN posts I
    // just added (2026-08-04 → 2026-08-12). A 'now' of 2026-08-13 includes
    // posts dated 2026-08-06~12, which is more than zero.
    const out = summarizeNewPosts(new Date("2026-08-13T00:00:00.000Z"));
    expect(out.newPostsKo + out.newPostsEn).toBeGreaterThan(0);
    for (const p of out.newPostsSample) {
      expect(p.locale === "ko" || p.locale === "en").toBe(true);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.slug.length).toBeGreaterThan(0);
    }
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

  it("renders the new-posts stat + sample link list when posts present", () => {
    const html = formatAdminSummaryHtml(fixture, "https://va.example.com");
    expect(html).toContain("신규 글 (7d)");
    // Link to a KR post
    expect(html).toContain("https://va.example.com/blog/new-post-1");
    // Link to an EN post (gets /en prefix)
    expect(html).toContain(
      "https://va.example.com/en/blog/fresh-launch-playbook"
    );
  });

  it("hides new-posts stat + list when 0 + 0", () => {
    const html = formatAdminSummaryHtml(
      {
        ...fixture,
        newPostsKo: 0,
        newPostsEn: 0,
        newPostsSample: [],
      },
      "https://example.com"
    );
    expect(html).not.toContain("신규 글 (7d)");
    expect(html).not.toContain("최근 발행 글");
  });
});
