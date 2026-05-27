import Link from "next/link";
import { ArrowRight, Target, Shield, Zap, Users } from "lucide-react";

export const revalidate = 86400;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "회사 소개 — Virtual Agency",
  description:
    "Virtual Agency 는 국내 광고주를 위한 AI 버추얼 모델 에이전시입니다. 미션, 원칙, 그리고 우리가 일하는 방식.",
  openGraph: {
    title: "회사 소개 — Virtual Agency",
    description: "AI 버추얼 모델 에이전시. 미션과 원칙.",
    url: `${SITE_URL}/about`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?about=1`],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "회사 소개 — Virtual Agency",
    description: "AI 버추얼 모델 에이전시. 미션과 원칙.",
    images: [`${SITE_URL}/api/og?about=1`],
  },
};

const PRINCIPLES = [
  {
    Icon: Target,
    title: "광고 효과가 먼저",
    body:
      "예쁜 컨셉보다 전환·인지·LTV 가 먼저. 캠페인 데이터로 모델을 평가하고, 모델로 캠페인을 평가합니다.",
  },
  {
    Icon: Shield,
    title: "브랜드 안전성",
    body:
      "학습 데이터 출처·초상권 클리어런스·AI 표기 가이드. 광고주가 법적·평판 리스크 없이 캠페인을 운영할 수 있도록 보장합니다.",
  },
  {
    Icon: Zap,
    title: "속도가 자산",
    body:
      "컨셉 컨펌부터 1차 컷까지 24~72시간. 광고 일정에 모델 일정이 끌려다니지 않습니다.",
  },
  {
    Icon: Users,
    title: "운영팀이 1차 응대",
    body:
      "광고주는 운영팀과만 소통하면 됩니다. 모델·크리에이터·법무·정산을 통합 운영해 광고주는 캠페인에만 집중.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-14">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            About · 회사 소개
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            AI 버추얼 모델로 <br />
            <span className="text-zinc-400">광고 캠페인을 가속화합니다.</span>
          </h1>
          <p className="mt-5 text-zinc-400 leading-relaxed">
            Virtual Agency 는 국내 광고주를 위한 AI 버추얼 모델 에이전시입니다.
            우리는 실존 인플루언서 캐스팅의 비용·속도·일관성 문제를 해결하고,
            동일 모델을 시즌 횡단으로 운영해 인지 누적이 사라지지 않는
            캠페인을 만듭니다.
          </p>
        </header>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">우리의 미션</h2>
          <blockquote className="border-l-2 border-zinc-700 pl-4 text-zinc-300 italic leading-relaxed">
            “촬영장 없이, 일 단위로 컨셉이 바뀌는 모델. 광고 효과는 더 크게,
            제작 비용·시간은 1/10 로.”
          </blockquote>
          <p className="text-sm text-zinc-400 mt-5 leading-relaxed">
            우리는 AI 가 광고 산업의 모든 것을 대체한다고 생각하지 않습니다.
            라이브 커머스, 진성 팬 기반 활동, 즉흥적 UGC 는 여전히 사람만
            만들 수 있습니다. 다만 캠페인의 &lsquo;얼굴&rsquo; 영역에서는 버추얼
            모델이 4~10배 효율 우위를 가집니다. 이 영역에 집중합니다.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-6">4가지 운영 원칙</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRINCIPLES.map((p) => (
              <li
                key={p.title}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <p.Icon className="w-4 h-4 text-zinc-400" />
                  <p className="font-semibold text-zinc-100">{p.title}</p>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">우리가 일하는 방식</h2>
          <ol className="list-decimal pl-5 space-y-2.5 text-sm text-zinc-300 leading-relaxed">
            <li>
              광고주는 카탈로그에서 모델을 직접 고르거나, AI 매칭에 컨셉을
              한 줄 입력합니다.
            </li>
            <li>
              운영팀이 24시간 내 견적 회신 + 라이선스 조건 확정.
            </li>
            <li>
              컨셉 컨펌 후 24~72시간 안에 1차 컷 납품. 광고주 대시보드에서
              단계별 진행률 실시간 추적.
            </li>
            <li>
              캠페인 종료 후 결과 리뷰 미팅. 다음 분기 로드맵까지 함께
              설계합니다.
            </li>
          </ol>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">자체 IP — K-aesthetic 모트</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-3">
            Virtual Agency 는 자체 K-aesthetic 캐릭터를 직접 설계하고
            소유합니다. 유나(쿨 미니멀 에디토리얼)와 렌(향수·시계 광고용 K-pop
            비주얼 레지스터). 두 캐릭터는 동일한 스타일링 DNA로 설계되어 있어
            브랜드가 솔로·페어·멀티 페이스 키트 중 어떤 형태로 라이선스해도
            캠페인이 시즌과 시장을 가로질러 같은 톤으로 읽힙니다.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            매 시즌 새로 캐스팅하지 않고 K-aesthetic 신뢰도를 유지하고 싶은
            브랜드가 캐릭터를 라이선스합니다. 한국 비주얼 레지스터 내부에서
            출발하지 않은 NL/US 경쟁자는 이 층을 복제하기 어렵습니다 —
            스튜디오의 IP 모트입니다.{" "}
            <Link href="/character" className="underline hover:text-white">
              캐릭터 로스터 보기
            </Link>
            .
          </p>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">자체 인프라</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            외부 API 만으로 운영하는 에이전시는 가격·납기·품질에서
            제약이 큽니다. Virtual Agency 는 자체 GPU 인프라(Easy Diffusion +
            FLUX, Cloudflare Tunnel)와 자체 Supabase 인스턴스, 자체 견적·계약·
            정산 시스템을 운영합니다. 외부 의존성을 최소화해 광고주에게
            안정적인 납기를 보장합니다.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            영상은 Kling/Minimax, 립싱크는 자체 파이프라인을 사용합니다.
            모든 모델은 라이선스 메타데이터·초상권 클리어런스를 데이터베이스
            수준에서 관리합니다.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">크리에이터 합류</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            자체 제작한 AI 버추얼 모델을 가진 크리에이터는 Virtual Agency
            카탈로그에 등록해 광고주 매칭 + 정산을 위임할 수 있습니다. 기본
            라이선스 수익의 70%, 독점 캠페인 수익의 60% 가 크리에이터 몫.
          </p>
          <Link
            href="/careers"
            className="inline-flex items-center gap-1 text-sm text-zinc-200 hover:text-white"
          >
            크리에이터 합류 페이지 <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <footer className="text-center pt-10 border-t border-zinc-900">
          <p className="text-sm text-zinc-300 mb-4">
            함께 캠페인을 만들어 보시겠어요?
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
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
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              납품 사례
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
