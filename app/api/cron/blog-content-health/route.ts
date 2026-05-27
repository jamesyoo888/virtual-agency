import { NextResponse } from "next/server";
import { loadBlogViews } from "@/lib/analytics/blog-views";
import { BLOG_POSTS, postLocale, type BlogPost } from "@/lib/blog/posts";
import { loadAdminEmails } from "@/lib/email/admin-summary";
import { notifyAdminWeeklySummary } from "@/lib/email/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron entry: /api/cron/blog-content-health (daily, 04:00 UTC).
 *
 * Surfaces published blog posts with zero views in the trailing 7d window
 * — content that may need a refresh (better headline / OG card / internal
 * link). New posts within their 14d warm-up are excluded so we don't alert
 * on content that simply hasn't had time to accumulate organic traffic.
 *
 * Silent in normal operation. Emails admins only when ≥1 stale post is
 * detected and that post is older than the warm-up grace period.
 */
function authorize(request: Request): boolean {
  const cron = request.headers.get("x-vercel-cron");
  if (cron) return true;
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  return !secret;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://virtual-agency-murex.vercel.app";

const WARMUP_DAYS = 14;
const WINDOW_DAYS = 7;
/**
 * Cap how many stale posts we list in a single alert. Beyond this we just
 * report the count so the email stays readable; admin can drill into
 * /admin/blog-analytics for the full list.
 */
const LIST_LIMIT = 20;

interface StalePost {
  slug: string;
  title: string;
  locale: "ko" | "en";
  publishedAt: string;
  ageDays: number;
}

export function findStalePosts(
  posts: BlogPost[],
  viewedSlugs: Set<string>,
  now: Date = new Date()
): StalePost[] {
  const warmupCutoff = new Date(
    now.getTime() - WARMUP_DAYS * 24 * 60 * 60 * 1000
  );
  return posts
    .filter((p) => {
      const published = new Date(p.publishedAt);
      if (Number.isNaN(published.getTime())) return false;
      if (published > warmupCutoff) return false; // still in warm-up
      return !viewedSlugs.has(p.slug);
    })
    .map<StalePost>((p) => {
      const published = new Date(p.publishedAt);
      const ageDays = Math.floor(
        (now.getTime() - published.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        slug: p.slug,
        title: p.title,
        locale: postLocale(p),
        publishedAt: p.publishedAt,
        ageDays,
      };
    })
    .sort((a, b) => b.ageDays - a.ageDays);
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const views = await loadBlogViews(WINDOW_DAYS);
  const viewedSlugs = new Set(views.bySlug.map((b) => b.slug));
  const stale = findStalePosts(BLOG_POSTS, viewedSlugs);

  if (stale.length === 0) {
    return NextResponse.json({
      skipped: true,
      reason: "no-stale",
      considered: BLOG_POSTS.length,
      viewedDistinct: viewedSlugs.size,
    });
  }

  // 30d gate — only alert when the blog overall had non-zero traffic in the
  // last 30 days. Prevents daily alerts during a quiet stretch when nothing
  // would be actionable anyway.
  const thirtyDay = await loadBlogViews(30);
  if (thirtyDay.total === 0) {
    return NextResponse.json({
      skipped: true,
      reason: "no-30d-baseline",
      stale: stale.length,
    });
  }

  const emails = await loadAdminEmails();
  if (emails.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no-admins", stale: stale.length });
  }

  const visibleStale = stale.slice(0, LIST_LIMIT);
  const moreCount = Math.max(0, stale.length - LIST_LIMIT);

  const subject = `[Virtual Agency] 7일간 조회 0 — 콘텐츠 ${stale.length}편 점검 필요`;
  const text = [
    `최근 7일 동안 조회가 한 건도 없던 블로그 글이 ${stale.length}편 있습니다.`,
    `(${WARMUP_DAYS}일 이내 신규 글은 워밍업으로 간주해 제외했고, 30일 누계에 블로그 조회가 ${thirtyDay.total}회 있던 시점입니다.)`,
    ``,
    `점검 후보 (오래된 글 순):`,
    ...visibleStale.map((p) => {
      const url =
        p.locale === "en" ? `${BASE_URL}/en/blog/${p.slug}` : `${BASE_URL}/blog/${p.slug}`;
      return `• [${p.locale.toUpperCase()}] ${p.title} — 게시 후 ${p.ageDays}일, ${url}`;
    }),
    moreCount > 0 ? `…외 ${moreCount}편 더` : "",
    ``,
    `액션 후보:`,
    `1. /admin/blog-analytics 에서 referrer 분석 — 검색 노출이 없는지 vs 클릭률이 낮은지`,
    `2. 제목·OG 카드 리프레시 또는 신선한 internal link (시리즈·캐릭터·glossary)`,
    `3. 의도적으로 묻혀둘 글이면 무시 OK — 알림은 단순 신호`,
  ]
    .filter(Boolean)
    .join("\n");

  const list = visibleStale
    .map((p) => {
      const url =
        p.locale === "en" ? `${BASE_URL}/en/blog/${p.slug}` : `${BASE_URL}/blog/${p.slug}`;
      const localeBadge = p.locale === "en" ? "EN" : "KR";
      return `<li style="margin:6px 0;line-height:1.5"><span style="display:inline-block;font-size:10px;background:#f4f4f5;color:#52525b;padding:1px 6px;border-radius:4px;margin-right:6px;letter-spacing:0.05em">${localeBadge}</span><a href="${url}" style="color:#0a0a0a;text-decoration:none">${escapeHtml(p.title)}</a> <span style="color:#999;font-size:12px">— ${p.ageDays}일</span></li>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;line-height:1.6;max-width:560px;margin:auto;padding:24px">
    <p style="font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px">블로그 콘텐츠 건강도</p>
    <h1 style="font-size:20px;margin:0 0 12px">7일 조회 0회 — ${stale.length}편</h1>
    <p style="margin:0 0 16px">${WARMUP_DAYS}일 이내 신규 글은 워밍업으로 제외했고, 30일 누계 블로그 조회는 <strong>${thirtyDay.total.toLocaleString()}회</strong>였습니다. 아래는 점검 후보 (오래된 글부터):</p>
    <ul style="margin:0 0 16px;padding-left:18px">${list}</ul>
    ${moreCount > 0 ? `<p style="font-size:12px;color:#999;margin:0 0 16px">… 외 ${moreCount}편 더 (전체는 대시보드에서 확인)</p>` : ""}
    <p style="margin:0 0 12px;font-size:14px"><strong>액션 후보</strong></p>
    <ol style="margin:0 0 16px;padding-left:20px">
      <li><a href="${BASE_URL}/admin/blog-analytics">/admin/blog-analytics</a> 에서 referrer 분석 — 검색 노출 vs 클릭률 어느 쪽이 문제인지</li>
      <li>제목·OG 카드 리프레시 또는 시리즈·캐릭터·glossary 페이지 cross-link 추가</li>
      <li>의도적으로 묻혀둘 글이면 무시 OK — 단순 신호</li>
    </ol>
    <p style="margin:16px 0">
      <a href="${BASE_URL}/admin/blog-analytics" style="display:inline-block;background:#111;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px">블로그 분석 대시보드</a>
    </p>
    <p style="font-size:12px;color:#999;margin:24px 0 0">자동 알림 — Virtual Agency cron (blog-content-health, daily 04:00 UTC).</p>
  </body></html>`;

  const results: Array<{ to: string; sent: boolean; reason?: string }> = [];
  for (const to of emails) {
    try {
      const r = await notifyAdminWeeklySummary(to, { subject, html, text });
      results.push({ to, sent: r.ok, reason: r.ok ? undefined : r.error });
    } catch (err) {
      results.push({
        to,
        sent: false,
        reason: err instanceof Error ? err.message : "error",
      });
    }
  }

  return NextResponse.json({
    alerted: true,
    sent: results.filter((r) => r.sent).length,
    considered: emails.length,
    stale: stale.length,
    listed: visibleStale.length,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
