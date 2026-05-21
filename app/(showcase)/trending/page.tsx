import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import ModelCard from "@/components/model-card";
import { TrendingUp, ArrowRight } from "lucide-react";
import {
  INDUSTRY_LABELS,
  INDUSTRY_OPTIONS,
  MOOD_LABELS,
  MOOD_OPTIONS,
} from "@/lib/tags";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "이번 주 트렌딩 모델 — Virtual Agency",
  description:
    "최근 30일 동안 광고주가 가장 많이 둘러본 AI 버추얼 모델 12명. 카탈로그의 실시간 활동 신호.",
  alternates: { canonical: "/trending" },
  openGraph: {
    title: "이번 주 트렌딩 모델 — Virtual Agency",
    description: "광고주가 실시간으로 둘러보는 AI 버추얼 모델 12명.",
    url: `${SITE_URL}/trending`,
    type: "website",
    images: [`${SITE_URL}/api/og?trending=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "이번 주 트렌딩 모델 — Virtual Agency",
    description: "광고주가 실시간으로 둘러보는 AI 버추얼 모델 12명.",
    images: [`${SITE_URL}/api/og?trending=1`],
  },
};

type PopularRow = Model & {
  view_count_30d: number;
  popularity_score: number;
};

async function loadTrending(
  limit: number,
  industry: string | null,
  mood: string | null
): Promise<PopularRow[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[])
      .filter((m) => {
        if (m.status !== "active") return false;
        if (industry && !(m.industry_tags ?? []).includes(industry as never))
          return false;
        if (mood && !(m.mood_tags ?? []).includes(mood as never)) return false;
        return true;
      })
      .slice(0, limit)
      .map((m) => ({ ...m, view_count_30d: 0, popularity_score: 0 }));
  }
  const supabase = await createClient();
  // models_with_popularity is the existing view (migration 006) that blends
  // follower_count + 30d views. We want raw view momentum here, so we sort
  // by view_count_30d directly. Models with zero views fall off the page.
  let query = supabase
    .from("models_with_popularity")
    .select("*")
    .eq("status", "active")
    .order("view_count_30d", { ascending: false })
    .gt("view_count_30d", 0);
  if (industry) query = query.contains("industry_tags", [industry]);
  if (mood) query = query.contains("mood_tags", [mood]);
  const { data } = await query.limit(limit);
  return (data as PopularRow[]) ?? [];
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string; mood?: string }>;
}) {
  const sp = await searchParams;
  const industry =
    sp.industry && INDUSTRY_LABELS[sp.industry] ? sp.industry : null;
  const mood = sp.mood && MOOD_LABELS[sp.mood] ? sp.mood : null;
  const models = await loadTrending(12, industry, mood);

  const buildHref = (next: { industry?: string | null; mood?: string | null }) => {
    const params = new URLSearchParams();
    const nextIndustry = "industry" in next ? next.industry : industry;
    const nextMood = "mood" in next ? next.mood : mood;
    if (nextIndustry) params.set("industry", nextIndustry);
    if (nextMood) params.set("mood", nextMood);
    const qs = params.toString();
    return qs ? `/trending?${qs}` : "/trending";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white">
            카탈로그
          </Link>
          <Link href="/match" className="hover:text-white">
            AI 매칭
          </Link>
          <Link href="/rfp" className="hover:text-white">
            RFP
          </Link>
        </nav>
      </header>

      <section className="px-5 md:px-8 py-12 md:py-16 border-b border-zinc-900">
        <div className="max-w-3xl flex items-start gap-4">
          <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0 mt-1.5" />
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-3">
              Trending — 30 days
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              이번 주 광고주가 가장 많이 둘러본 모델
            </h1>
            <p className="text-zinc-400 leading-relaxed">
              최근 30일 페이지 뷰 기준 상위 {models.length}명. 광고주가 실시간으로 평가하고 있는 카탈로그 동향을 그대로 노출합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 md:px-8 py-4 border-b border-zinc-900">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mr-2">
            산업
          </span>
          <Link
            href={buildHref({ industry: null })}
            className={`px-2.5 py-1 rounded-full border ${
              !industry
                ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            전체
          </Link>
          {INDUSTRY_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref({ industry: opt.value })}
              className={`px-2.5 py-1 rounded-full border ${
                industry === opt.value
                  ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mr-2">
            무드
          </span>
          <Link
            href={buildHref({ mood: null })}
            className={`px-2.5 py-1 rounded-full border ${
              !mood
                ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            전체
          </Link>
          {MOOD_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref({ mood: opt.value })}
              className={`px-2.5 py-1 rounded-full border ${
                mood === opt.value
                  ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 md:px-8 py-12">
        {models.length === 0 ? (
          <div className="max-w-3xl mx-auto rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm text-zinc-500">
              아직 트렌딩 데이터가 충분히 쌓이지 않았습니다. 카탈로그를 둘러보면 다음 갱신에 반영됩니다.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-4 text-sm text-zinc-300 hover:text-white"
            >
              카탈로그 둘러보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {models.map((m, idx) => (
              <div key={m.id} className="relative">
                <span className="absolute z-10 -top-2 -left-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/90 text-black text-[10px] font-bold tracking-wider">
                  #{idx + 1}
                </span>
                <ModelCard model={m} variant="showcase" />
                <p className="mt-1.5 text-[10px] text-zinc-600 tracking-wider">
                  30일 노출 {m.view_count_30d.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-5 md:px-8 py-12 border-t border-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-zinc-400 leading-relaxed">
            원하는 무드·산업이 잡히지 않는다면 1줄 브리프로{" "}
            <Link
              href="/match"
              className="text-zinc-200 underline underline-offset-4 hover:text-white"
            >
              AI 매칭
            </Link>
            을 받아보세요. 24시간 안에 1차 추천 + 견적 회신드립니다.
          </p>
        </div>
      </section>
    </div>
  );
}
