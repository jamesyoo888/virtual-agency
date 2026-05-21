import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { INDUSTRY_LABELS } from "@/lib/tags";
import type { IndustryTag } from "@/types";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";
import { ArrowRight } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "사례 — Virtual Agency",
  description:
    "광고주가 실제로 납품받은 캠페인 사례. 산업·납기·결과 anonymized.",
  openGraph: {
    title: "사례 — Virtual Agency",
    description: "광고주가 실제로 납품받은 캠페인 사례.",
    images: [`${SITE_URL}/api/og?cases=1`],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "사례 — Virtual Agency",
    description: "광고주가 실제로 납품받은 캠페인 사례.",
    images: [`${SITE_URL}/api/og?cases=1`],
  },
};

interface CaseRow {
  id: string;
  title: string;
  brief: string | null;
  created_at: string;
  updated_at: string;
  model?: {
    name: string | null;
    concept_image: string | null;
    industry_tags: IndustryTag[] | null;
  } | null;
  client?: { company: string | null } | null;
}

interface CaseSummary {
  totalDelivered: number;
  byIndustry: { tag: IndustryTag; count: number }[];
  avgTurnaroundDays: number | null;
}

async function loadCases(): Promise<{
  cases: CaseRow[];
  summary: CaseSummary;
}> {
  if (!SUPABASE_CONFIGURED) {
    return {
      cases: [],
      summary: { totalDelivered: 0, byIndustry: [], avgTurnaroundDays: null },
    };
  }
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("projects")
    .select(
      "id, title, brief, created_at, updated_at, model:models(name, concept_image, industry_tags), client:clients(company)",
      { count: "exact" }
    )
    .eq("status", "delivered")
    .order("updated_at", { ascending: false })
    .limit(24);

  const rows = (data as unknown as CaseRow[]) ?? [];

  // Aggregate industry breakdown from the visible slice — same query pays for
  // the rollup without a second round-trip.
  const industryCounts = new Map<IndustryTag, number>();
  let totalTurnaroundMs = 0;
  let turnaroundSampled = 0;
  for (const c of rows) {
    for (const tag of c.model?.industry_tags ?? []) {
      industryCounts.set(tag, (industryCounts.get(tag) ?? 0) + 1);
    }
    const ms =
      new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
    if (Number.isFinite(ms) && ms > 0) {
      totalTurnaroundMs += ms;
      turnaroundSampled++;
    }
  }
  const byIndustry = [...industryCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const avgTurnaroundDays =
    turnaroundSampled === 0
      ? null
      : Math.max(
          1,
          Math.round(totalTurnaroundMs / turnaroundSampled / (1000 * 60 * 60 * 24))
        );

  return {
    cases: rows,
    summary: {
      totalDelivered: count ?? rows.length,
      byIndustry,
      avgTurnaroundDays,
    },
  };
}

function anonymizeCompany(company: string | null | undefined): string {
  if (!company) return "비공개 광고주";
  const trimmed = company.trim();
  if (trimmed.length <= 2) return `${trimmed[0] ?? "?"}*`;
  return `${trimmed[0]}${"*".repeat(Math.min(trimmed.length - 2, 6))}${trimmed.slice(-1)}`;
}

function turnaroundLabel(createdAt: string, updatedAt: string): string {
  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  return `${days}일`;
}

export default async function CasesPage() {
  const { cases, summary } = await loadCases();

  // Cases ItemList: anonymized titles + cases-page anchor (no canonical detail
  // page yet, but Google still picks up the ordered list signal).
  const ld = itemListLd(
    "Virtual Agency 납품 사례",
    cases.map((c) => ({
      name: c.title,
      url: `${SITE_URL}/cases#${c.id}`,
      image: c.model?.concept_image ?? undefined,
    }))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Cases · 사례
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            실제 납품 사례
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            광고주 사명은 anonymized 처리되었습니다. 산업, 납기, 모델 선택은
            실제 데이터입니다.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <p className="text-3xl font-semibold tabular-nums">
              {summary.totalDelivered}
            </p>
            <p className="text-xs text-zinc-500 mt-1">납품 완료 캠페인</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <p className="text-3xl font-semibold tabular-nums">
              {summary.avgTurnaroundDays ?? "—"}
              {summary.avgTurnaroundDays != null && (
                <span className="text-base font-normal text-zinc-500 ml-1">
                  일
                </span>
              )}
            </p>
            <p className="text-xs text-zinc-500 mt-1">평균 납기</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            {summary.byIndustry.length > 0 ? (
              <ul className="space-y-1">
                {summary.byIndustry.slice(0, 3).map((b) => (
                  <li
                    key={b.tag}
                    className="flex items-center justify-between text-xs text-zinc-300"
                  >
                    <span>{INDUSTRY_LABELS[b.tag] ?? b.tag}</span>
                    <span className="text-zinc-500 tabular-nums">{b.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">산업 정보 집계 중</p>
            )}
            <p className="text-xs text-zinc-500 mt-2">주요 산업</p>
          </div>
        </section>

        {cases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
            아직 공개 가능한 사례가 없습니다. 곧 업데이트됩니다.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <li
                key={c.id}
                id={c.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden scroll-mt-24"
              >
                <div className="aspect-[4/3] bg-zinc-900 relative">
                  {c.model?.concept_image ? (
                    <Image
                      src={c.model.concept_image}
                      alt={c.model.name ?? ""}
                      fill
                      className="object-cover opacity-90"
                      sizes="(min-width: 768px) 50vw, 100vw"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-zinc-700 text-xs">
                      이미지 비공개
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="text-xs text-zinc-500">
                      {anonymizeCompany(c.client?.company)}
                    </p>
                    <p className="text-[10px] text-zinc-600 tabular-nums">
                      납기 {turnaroundLabel(c.created_at, c.updated_at)}
                    </p>
                  </div>
                  <h2 className="text-base font-semibold">{c.title}</h2>
                  {c.model?.name && (
                    <p className="text-xs text-zinc-400 mt-1">
                      모델: {c.model.name}
                    </p>
                  )}
                  {c.model?.industry_tags && c.model.industry_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {c.model.industry_tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] border border-zinc-800 text-zinc-400 rounded px-1.5 py-0.5"
                        >
                          {INDUSTRY_LABELS[tag] ?? tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-16 pt-8 border-t border-zinc-900 text-center">
          <p className="text-sm text-zinc-300">
            비슷한 캠페인을 시작하고 싶으신가요?
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/match"
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-4 py-2 hover:bg-zinc-200"
            >
              AI 매칭 시작 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              가격 보기
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
