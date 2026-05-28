import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Users, Calendar, Calculator } from "lucide-react";
import { listCharacters } from "@/lib/characters/registry";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "캐릭터 브랜드 키트 — 페어·시리즈 캐스팅 · Virtual Agency",
  description:
    "유나 + 렌을 묶은 멀티 페이스 캠페인 패키지. 한 시즌 전체에 스타일링 DNA를 잠그고, 카테고리 독점 라이선스도 옵션.",
  alternates: {
    canonical: `${SITE_URL}/character/brand-kits`,
    languages: {
      ko: `${SITE_URL}/character/brand-kits`,
      en: `${SITE_URL}/en/character/brand-kits`,
    },
  },
  openGraph: {
    title: "캐릭터 브랜드 키트 — 페어·시리즈 캐스팅",
    description: "유나 + 렌을 묶은 멀티 페이스 캠페인 패키지.",
    url: `${SITE_URL}/character/brand-kits`,
    locale: "ko_KR",
    type: "website",
    images: [`${SITE_URL}/api/og?character_brand_kits=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "캐릭터 브랜드 키트 — 페어·시리즈 캐스팅",
    description: "유나 + 렌을 묶은 멀티 페이스 캠페인 패키지.",
    images: [`${SITE_URL}/api/og?character_brand_kits=1`],
  },
};

interface KitTier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  characters: string;
  exclusivity: string;
  bestFor: string;
}

const KITS: KitTier[] = [
  {
    name: "페어 에디토리얼",
    price: "₩11,000,000",
    cadence: "분기",
    description:
      "두 캐릭터가 한 프레임에 등장하는 에디토리얼 스타일 캠페인. 단일 스타일링 컨셉, 두 얼굴.",
    highlights: [
      "페어 히어로 스틸 10컷 (유나 + 렌 동시 등장)",
      "솔로 스틸 10컷 (캐릭터당 5컷)",
      "페어 숏 비디오 1편 (15초)",
      "키트 전체에 팔레트·워드로브 잠금",
    ],
    characters: "유나 + 렌",
    exclusivity: "비독점 — 페어 한정",
    bestFor:
      "K-뷰티 커플 내러티브, 향수 런칭, 패션 에디토리얼.",
  },
  {
    name: "시즌 앵커 (커플)",
    price: "₩28,500,000",
    cadence: "분기",
    description:
      "한 시즌 전체를 커플 캐릭터로 앵커링. 두 캐릭터 모두 산업 독점 라이선스, 모든 산출물 포함.",
    highlights: [
      "페어 + 솔로 스틸 40컷",
      "히어로 비디오 3편 (각 15~30초)",
      "팀과의 피팅 데이 1회",
      "한 캐릭터의 페르소나 인스타그램 90일",
      "분기별 컨셉 리프레시",
    ],
    characters: "유나 + 렌",
    exclusivity: "카테고리 독점 (귀사 산업 내 경쟁사 잠금)",
    bestFor:
      "뷰티 하우스 앰버서더 스타일 프로그램, 패션 룩북 시리즈, 럭셔리 멘즈·우먼즈 페어링.",
  },
  {
    name: "커스텀 멀티 페이스",
    price: "₩65,000,000부터",
    cadence: "분기",
    description:
      "유나 + 렌 + 브랜드 전용 추가 캐릭터. 멀티 시즌 캠페인에서 인지 가능한 캐스트가 필요할 때 적합.",
    highlights: [
      "브랜드 DNA로 만든 원본 제3 캐릭터",
      "멀티 캐릭터 내러티브 씬 (3+명 동시 등장)",
      "분기별 리프레시 + 컨셉 컨설팅",
      "옵션: 글로벌 지역별 적응",
      "옵션: 커스텀 캐릭터 IP 전면 이전",
    ],
    characters: "유나 + 렌 + 커스텀",
    exclusivity: "전면 독점 — 귀사 산업, 모든 시장",
    bestFor:
      "캐스트 자체가 캠페인의 핵심인 브랜드 정의 캠페인. 2시즌 이상에 걸쳐 같은 캐스트 반복.",
  },
];

const USE_CASES = [
  {
    title: "커플 내러티브",
    body:
      "향수·주얼리·라이프스타일 브랜드가 페어 미학에 의존하는 케이스. 유나의 에디토리얼 절제미와 렌의 차분한 시네마틱 레지스터가 잘 어울립니다.",
  },
  {
    title: "크로스 젠더 브랜드 키트",
    body:
      "남녀 라인을 같은 시즌에 런칭하는 패션 하우스. 하나의 스타일링 컨셉, 두 얼굴, 라인 간 연속성 드리프트 없음.",
  },
  {
    title: "시리즈 캐스팅",
    body:
      "에피소드를 반복하는 숏폼 비디오 시리즈, 룩북 챕터, 캠페인 필름. 두 캐릭터가 동일한 스타일링 DNA로 설계되어 있어 신뢰감 있는 캐스트로 읽힙니다.",
  },
];

export default function KrCharacterBrandKitsPage() {
  const characters = listCharacters();
  const ld = itemListLd(
    "Virtual Agency 캐릭터 브랜드 키트",
    KITS.map((k, i) => ({
      name: k.name,
      url: `${SITE_URL}/character/brand-kits#kit-${i + 1}`,
    }))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            브랜드 키트 · 멀티 페이스 캠페인
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            캐스트를 묶어서 라이선스.
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            한 시즌에 얼굴 하나로 끝나지 않는 브랜드가 많습니다. 자체
            캐릭터는 동일한 스타일링 DNA로 설계되어 있어, 커플 내러티브·
            남녀 동시 런칭·시리즈 캐스팅을 단일 브랜드 키트로 묶을 수
            있습니다. 연속성 작업을 두 번 지불할 필요가 없습니다.
          </p>
        </header>

        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((c) => (
              <Link
                key={c.slug}
                href={`/character/${c.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600 transition-colors"
              >
                <p className="text-xl font-bold group-hover:underline">
                  {c.name}
                </p>
                <p className="text-sm text-zinc-400 mt-1">{c.tagline}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-3">
                  이 키트에 페어링됩니다
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-2">
            3개 티어
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            모든 가격은 부가세 별도 KRW. 정식 견적은 24시간 이내 회신.
          </p>
          <Link
            href="/pricing-calculator?utm_source=character&utm_campaign=brand_kit_calc_anchor"
            className="block mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-colors p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-1.5 mt-0.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-200" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 mb-0.5">
                  내 스코프엔 어떤 티어?
                </p>
                <p className="text-sm font-semibold text-zinc-100">
                  3 티어 중 본인 캠페인에 맞는 path 찾기 →{" "}
                  <span className="text-emerald-300">견적 계산기</span>
                </p>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  어셋 수·시즌·시장·독점 입력 → paired/season/custom 권장 path
                  자동 매핑 + KRW + USD 견적. 티어 결정 전에 무료 체크.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/blog/license-vs-brand-kit-break-even-worked-example-ko"
            className="block mb-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.03] hover:border-amber-400/50 hover:bg-amber-500/[0.07] transition-colors p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-1.5 mt-0.5 text-amber-200 font-bold text-[10px] leading-none flex items-center justify-center w-6 h-6">
                ÷
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300 mb-0.5">
                  라이선스 vs paired — 어디서 갈리나
                </p>
                <p className="text-sm font-semibold text-zinc-100">
                  손익분기점은 hero 컷 ≈ 14 — 워크 예시 3 가지로 풀이
                </p>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  12 / 24 / 48 컷 캠페인의 실제 수학. 일별 라이선스가 더 싸
                  보이는 어셋 수와 paired 가 이기는 어셋 수의 임계점.
                </p>
              </div>
            </div>
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KITS.map((k, i) => (
              <article
                key={k.name}
                id={`kit-${i + 1}`}
                className={`rounded-2xl border p-6 flex flex-col scroll-mt-24 ${
                  i === 1
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-zinc-800 bg-zinc-950/40"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  {k.characters}
                </p>
                <h3 className="text-lg font-semibold mb-2">{k.name}</h3>
                <p className="text-3xl font-bold text-white mb-1 tabular-nums">
                  {k.price}
                </p>
                <p className="text-xs text-zinc-500 mb-4">/ {k.cadence}</p>
                <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
                  {k.description}
                </p>
                <ul className="text-sm text-zinc-300 space-y-1.5 mb-5 flex-1">
                  {k.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span className="text-zinc-600">·</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-zinc-900 pt-3 text-xs text-zinc-500 space-y-1">
                  <p>
                    <span className="text-zinc-400">독점성:</span>{" "}
                    {k.exclusivity}
                  </p>
                  <p>
                    <span className="text-zinc-400">적합한 케이스:</span>{" "}
                    {k.bestFor}
                  </p>
                </div>
                <Link
                  href={`/rfp?campaign=${encodeURIComponent(k.name)}&exclusive=${i >= 1 ? "true" : "false"}&utm_source=character&utm_campaign=brand_kit_${i === 0 ? "paired" : i === 1 ? "season" : "custom"}`}
                  className={`mt-5 inline-flex items-center justify-center gap-1 text-sm rounded-md px-3 py-2 ${
                    i === 1
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "border border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  이 키트로 견적 <ArrowRight className="w-3 h-3" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-6">
            페어 키트가 잘 맞는 케이스
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {USE_CASES.map((u, i) => (
              <div
                key={u.title}
                className="rounded-xl border border-zinc-900 p-5"
              >
                <div className="flex items-center gap-2 mb-3 text-zinc-500">
                  {i === 0 ? (
                    <Sparkles className="w-4 h-4" />
                  ) : i === 1 ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <p className="text-[10px] uppercase tracking-wider">
                    케이스 {i + 1}
                  </p>
                </div>
                <p className="font-semibold text-zinc-100 mb-2">{u.title}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            컴플라이언스
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            모든 키트의 모든 캐릭터는 EU AI Act Article 50, US FTC Endorsement
            Guides, UK ASA / CAP Code, 한국 방심위·공정위 가이드에 맞는 합성
            콘텐츠 표기 메타데이터와 함께 납품됩니다. 자세한 표기 정책은{" "}
            <Link
              href="/legal/ai-disclosure"
              className="underline hover:text-white"
            >
              AI 합성 콘텐츠 표기 페이지
            </Link>
            를 참고하세요.
          </p>
        </section>

        <footer className="mt-12 pt-8 border-t border-zinc-900 flex flex-wrap gap-3">
          <Link
            href="/rfp?campaign=캐릭터 브랜드 키트&utm_source=character&utm_campaign=brand_kit_index"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            브랜드 키트 견적 받기
          </Link>
          <Link
            href="/character"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            개별 캐릭터 보기
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            기본 가격
          </Link>
        </footer>
      </main>
    </div>
  );
}
