import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 86400;

const PUBLISHED_AT = "2026-05-27T00:00:00+09:00";
const HEADLINE =
  "Virtual Agency, 글로벌 브랜드용 자체 K-aesthetic 합성 모델 «Yuna» «Ren» 라인업 공개";

export const metadata: Metadata = {
  title: `프레스 릴리스 — Virtual Agency 캐릭터 라인업 공개`,
  description:
    "글로벌 K-aesthetic 광고 캠페인을 위한 자체 설계 AI 합성 모델 Yuna · Ren 공개. 카테고리 독점 라이선스 + 분기 단위 페어 브랜드 키트 출시.",
  alternates: {
    canonical: `${SITE_URL}/press/character-launch`,
    languages: {
      ko: `${SITE_URL}/press/character-launch`,
      en: `${SITE_URL}/en/press/character-launch`,
    },
  },
  openGraph: {
    title: "Virtual Agency 캐릭터 라인업 공개 — Yuna + Ren",
    description: "자체 K-aesthetic IP 라이선스 인프라 출시.",
    url: `${SITE_URL}/press/character-launch`,
    locale: "ko_KR",
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [`${SITE_URL}/api/og?characters=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: HEADLINE,
    description: "Yuna + Ren — 글로벌 K-aesthetic 캠페인용 자체 IP.",
    images: [`${SITE_URL}/api/og?characters=1`],
  },
};

export default function KrCharacterLaunchPress() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: HEADLINE,
    datePublished: PUBLISHED_AT,
    dateModified: PUBLISHED_AT,
    publisher: {
      "@type": "Organization",
      name: "Virtual Agency",
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/press/character-launch`,
    image: [`${SITE_URL}/api/og?characters=1`],
    articleSection: "Press",
    inLanguage: "ko",
  };
  const crumbsLd = breadcrumbLd([
    { name: "홈", url: SITE_URL },
    { name: "프레스", url: `${SITE_URL}/press` },
    {
      name: "캐릭터 라인업 공개",
      url: `${SITE_URL}/press/character-launch`,
    },
  ]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbsLd) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/press"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          ← 프레스
        </Link>

        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            프레스 릴리스 · 즉시 배포
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {HEADLINE}
          </h1>
          <p className="mt-4 text-sm text-zinc-500">
            서울 · 2026년 5월 27일 — Virtual Agency
          </p>
        </header>

        <article className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed space-y-5">
          <p>
            한국발 글로벌 광고 캠페인 인프라 기업 <strong>Virtual Agency</strong>
            는 오늘 자체 설계한 K-aesthetic AI 합성 모델 라인업 «Yuna» 와
            «Ren» 의 공개를 발표했습니다. 글로벌 뷰티·패션·럭셔리 브랜드가 매
            시즌 새로 캐스팅하지 않고도 한국 비주얼 레지스터의 신뢰도를
            유지할 수 있도록 설계된 라이선스 가능한 캐릭터 IP 라인업입니다.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            글로벌 브랜드가 직면한 K-aesthetic 일관성 문제
          </h2>
          <p>
            K-pop·K-drama·K-beauty 의 글로벌화로 K-aesthetic 은 광고 카테고리
            전반에서 인지 가능한 시각 코드가 되었습니다. 그러나 글로벌
            브랜드는 매 시즌 새로 캐스팅하면서 톤이 흔들리고, 시장 간 동시
            런칭에서 같은 얼굴을 유지하기 어려운 운영 마찰을 겪어 왔습니다.
            Virtual Agency 의 캐릭터 라이선스 인프라는 이 문제를 해결합니다.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            Yuna — 쿨 미니멀 서울 에디토리얼
          </h2>
          <p>
            Yuna 는 24세의 가상 K-aesthetic 여성 모델입니다. 글로벌 뷰티·
            패션·테크·라이프스타일 브랜드가 서울 비주얼 레지스터(소프트한
            글래스 스킨 라이팅, 쿨 방향의 팔레트, 절제된 에디토리얼 표현)를
            활용할 수 있도록 설계되었습니다. 캠페인이 뉴욕·베를린·싱가포르
            어디서든 자연스럽게 어울리는 톤이 핵심입니다.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            Ren — 향수 & 시계용 K-pop 비주얼 레지스터
          </h2>
          <p>
            Ren 은 26세의 가상 K-aesthetic 남성 모델입니다. K-pop 비주얼
            레지스터(샤프한 턱선, 또렷한 눈매, 절제된 에디토리얼 표정)를
            K-pop 직접 차용 없이 구현한 캐릭터로, 글로벌 향수·시계·럭셔리
            멘즈웨어·시네마틱 광고를 겨냥했습니다. Yuna 와 동일한 스타일링
            DNA 로 설계되어 페어 캐스팅이 가능합니다.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            라이선스 구조 — 솔로 · 페어 · 멀티 페이스
          </h2>
          <p>
            세 단계의 분기 단위 라이선스가 동시 출시됩니다. «Paired
            Editorial» (₩11,000,000 / 분기) — 두 캐릭터가 한 프레임에
            등장하는 에디토리얼 캠페인. «Season Anchor (커플)»
            (₩28,500,000 / 분기) — 카테고리 독점 + 페어 + 솔로 풀 셋 + 한
            캐릭터의 페르소나 인스타그램 90일. «커스텀 멀티 페이스»
            (₩65,000,000부터 / 분기) — Yuna + Ren + 브랜드 전용 추가 캐릭터.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            컴플라이언스 — 4 시장 disclosure 메타데이터
          </h2>
          <p>
            모든 키트의 모든 캐릭터는 EU AI Act Article 50, US FTC
            Endorsement Guides, UK ASA / CAP Code, 한국 방심위·공정거래위원회
            가이드에 맞는 합성 콘텐츠 표기 메타데이터와 함께 납품됩니다.
            C2PA 출처 정보 + 시장별 «AI Synthetic» 문자열 + 생성 해시 + 브랜드
            서명까지 모든 파일에 동봉됩니다.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            Virtual Agency 정보
          </h2>
          <p>
            Virtual Agency 는 한국 시각 언어를 기반으로 글로벌 브랜드용
            합성 모델 인프라를 운영하는 광고 캠페인 스튜디오입니다. 자체
            GPU 인프라 + Supabase 셀프호스팅 + Stripe 글로벌 결제 + 4 시장
            disclosure 컴플라이언스 파이프라인을 직접 운영합니다.
          </p>
        </article>

        <section className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              미디어 문의
            </p>
            <p className="text-zinc-300">
              press@aihubs.uk
              <br />
              <span className="text-zinc-500 text-xs">
                응답 SLA: 24시간 (KST 평일 기준)
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              자산
            </p>
            <ul className="text-zinc-300 space-y-1">
              <li>
                <Link
                  href="/character"
                  className="underline hover:text-white"
                >
                  캐릭터 로스터
                </Link>
              </li>
              <li>
                <Link
                  href="/character/brand-kits"
                  className="underline hover:text-white"
                >
                  브랜드 키트 티어
                </Link>
              </li>
              <li>
                <Link
                  href="/character/compare"
                  className="underline hover:text-white"
                >
                  Yuna vs Ren 비교
                </Link>
              </li>
              <li>
                <Link
                  href="/press"
                  className="underline hover:text-white"
                >
                  프레스 키트
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <p className="mt-12 text-[11px] text-zinc-600 leading-relaxed">
          ###
          <br />
          Yuna 와 Ren 은 AI 합성 모델입니다. 자세한 시장별 표기 의무는{" "}
          <Link
            href="/legal/ai-disclosure"
            className="underline hover:text-zinc-300"
          >
            AI 합성 콘텐츠 표기 정책
          </Link>
          을 참고하세요.
        </p>
      </main>
    </div>
  );
}
