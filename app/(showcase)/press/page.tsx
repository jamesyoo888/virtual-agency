import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Download, Mail, ArrowRight } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "프레스 — Virtual Agency",
  description:
    "Virtual Agency 보도자료, 회사 소개, 로고 자산, 미디어 문의 창구.",
  openGraph: {
    title: "프레스 — Virtual Agency",
    description: "통계·로고·미디어 문의 한 곳에서.",
    url: `${SITE_URL}/press`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?press=1`],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "프레스 — Virtual Agency",
    description: "통계·로고·미디어 문의.",
    images: [`${SITE_URL}/api/og?press=1`],
  },
};

interface PressStats {
  activeModels: number | null;
  deliveredProjects: number | null;
  reviewedModels: number | null;
}

async function loadStats(): Promise<PressStats> {
  if (!SUPABASE_CONFIGURED) {
    return { activeModels: null, deliveredProjects: null, reviewedModels: null };
  }
  try {
    const supabase = await createClient();
    const [models, delivered, reviews] = await Promise.all([
      supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),
      supabase
        .from("reviews")
        .select("model_id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);
    return {
      activeModels: models.count ?? null,
      deliveredProjects: delivered.count ?? null,
      reviewedModels: reviews.count ?? null,
    };
  } catch {
    return { activeModels: null, deliveredProjects: null, reviewedModels: null };
  }
}

export default async function PressPage() {
  const stats = await loadStats();

  const facts = [
    {
      label: "활성 모델",
      value: stats.activeModels != null ? `${stats.activeModels}+` : "비공개",
    },
    {
      label: "납품 캠페인",
      value:
        stats.deliveredProjects != null
          ? `${stats.deliveredProjects}+`
          : "비공개",
    },
    {
      label: "검증된 광고주 리뷰",
      value:
        stats.reviewedModels != null ? `${stats.reviewedModels}+` : "비공개",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Press · Media kit
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Virtual Agency 프레스 자료
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            국내 최초의 AI 버추얼 모델 에이전시. 광고주가 일 단위로
            지정한 컨셉을 즉시 촬영해 납품합니다. 본 페이지의 모든 텍스트와
            로고 자산은 보도용으로 자유롭게 사용 가능합니다.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-4 mb-16">
          {facts.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40"
            >
              <p className="text-2xl font-semibold tabular-nums">{f.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{f.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">한 줄 소개</h2>
          <blockquote className="border-l-2 border-zinc-700 pl-4 text-zinc-300 italic">
            “촬영장 없이, 일 단위로 컨셉이 바뀌는 모델. Virtual Agency 는
            실제 인플루언서 캐스팅보다 10배 빠르고 100분의 1 비용으로 광고
            영상을 만듭니다.”
          </blockquote>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">회사 소개 (long form)</h2>
          <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
            <p>
              Virtual Agency 는 AI 로 생성된 버추얼 모델을 광고주에게
              매칭·납품하는 에이전시입니다. 우리는 실존 인플루언서에 의존하는
              기존 캠페인 제작의 비용·속도·일관성 문제를 해결합니다.
            </p>
            <p>
              플랫폼은 (1) 컨셉별 모델 카탈로그, (2) AI 매칭·견적 엔진,
              (3) 영상·이미지 자동 생성 스튜디오, (4) 라이선스 계약 자동화로
              구성됩니다. 광고주는 단 한 번의 브리프 입력으로 모델 선택부터
              납품까지 24시간 안에 받아볼 수 있습니다.
            </p>
            <p>
              현재 베타로 운영 중이며, 국내 패션·뷰티·디지털 광고
              에이전시와 협업하고 있습니다.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">브랜드 자산</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
              <div className="h-24 flex items-center justify-center rounded bg-white text-black font-bold tracking-widest uppercase mb-4">
                Virtual Agency
              </div>
              <p className="text-sm text-zinc-300 font-medium">
                기본 로고 (라이트)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                밝은 배경에 사용. 최소 폭 80px.
              </p>
              <a
                href="/press/logo-light.svg"
                download
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 rounded-md px-2.5 py-1.5"
              >
                <Download className="w-3 h-3" /> SVG
              </a>
            </div>
            <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
              <div className="h-24 flex items-center justify-center rounded bg-black border border-zinc-700 text-white font-bold tracking-widest uppercase mb-4">
                Virtual Agency
              </div>
              <p className="text-sm text-zinc-300 font-medium">
                반전 로고 (다크)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                어두운 배경에 사용. 최소 폭 80px.
              </p>
              <a
                href="/press/logo-dark.svg"
                download
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 rounded-md px-2.5 py-1.5"
              >
                <Download className="w-3 h-3" /> SVG
              </a>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            로고는 비례 변형·색상 임의 변경 없이 사용해 주세요. 결합 로고,
            영문/한글 별도 자산이 필요하시면 미디어 문의로 요청해 주세요.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">대표 이미지</h2>
          <p className="text-sm text-zinc-400 mb-4">
            카탈로그에서 사용 중인 모델 콘셉트 이미지는 라이선스 사용권을
            가진 광고주에게만 배포됩니다. 보도용 일반 비주얼은 미디어
            문의로 요청해 주세요.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white"
          >
            카탈로그 보기 <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">미디어 문의</h2>
          <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
            <p className="text-sm text-zinc-300">보도 자료, 인터뷰, 사례
            취재 등 미디어 문의는 아래 채널로 연락해 주세요.</p>
            <a
              href="mailto:press@aihubs.uk"
              className="mt-4 inline-flex items-center gap-2 text-sm text-white hover:underline"
            >
              <Mail className="w-4 h-4" />
              press@aihubs.uk
            </a>
            <p className="text-xs text-zinc-500 mt-3">
              평일 24시간 이내 회신을 목표로 합니다.
            </p>
          </div>
        </section>

        <footer className="text-xs text-zinc-600 border-t border-zinc-900 pt-6">
          본 페이지의 모든 통계는 실시간 데이터베이스에서 집계됩니다.
        </footer>
      </main>
    </div>
  );
}
