import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCharacters } from "@/lib/characters/registry";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "캐릭터 — Virtual Agency",
  description:
    "Virtual Agency가 소유한 K-aesthetic 합성 모델 IP. 유나·렌을 비롯한 캐릭터 로스터.",
  alternates: {
    canonical: `${SITE_URL}/character`,
    languages: {
      ko: `${SITE_URL}/character`,
      en: `${SITE_URL}/en/character`,
    },
  },
  openGraph: {
    title: "캐릭터 — Virtual Agency",
    description: "Virtual Agency가 소유한 K-aesthetic 합성 모델 IP.",
    url: `${SITE_URL}/character`,
    locale: "ko_KR",
    type: "website",
    images: [`${SITE_URL}/api/og?en=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "캐릭터 — Virtual Agency",
    description: "Virtual Agency 소유 K-aesthetic 캐릭터 로스터.",
    images: [`${SITE_URL}/api/og?en=1`],
  },
};

const KO_PERSONA: Record<string, string> = {
  yuna: "쿨하고 미니멀한 서울 에디토리얼 페이스",
  ren: "K-pop 비주얼 레지스터의 향수·시계 광고용 남성 캐릭터",
};

export default function KrCharactersIndex() {
  const characters = listCharacters();
  const ld = itemListLd(
    "Virtual Agency 소유 캐릭터",
    characters.map((c) => ({
      name: c.name,
      url: `${SITE_URL}/character/${c.slug}`,
      image: `${SITE_URL}/api/og?en_character=${c.slug}`,
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
            자체 K-aesthetic IP
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            캐릭터
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            시즌·시장을 가로질러 같은 얼굴로 일관된 브랜드 아이덴티티를
            구축할 수 있도록 자체 제작한 캐릭터 모델입니다. 한 명의 캐릭터가
            여러 시장과 분기를 가로질러 활동하고, 합성 표기는 모든 산출물에
            기본 적용됩니다.
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {characters.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/character/${c.slug}`}
                className="group block rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 hover:border-zinc-600 transition-colors"
              >
                <p className="text-2xl font-bold text-zinc-100 group-hover:underline">
                  {c.name}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  {KO_PERSONA[c.slug] ?? c.tagline}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
                  {c.targetVerticals.slice(0, 4).map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-400 group-hover:text-white">
                  캐릭터 상세 보기 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 mb-10">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-2">
            브랜드 키트
          </p>
          <p className="text-zinc-200 font-semibold mb-1">
            여러 얼굴을 한꺼번에 라이선스하는 브랜드가 많습니다.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            유나와 렌은 동일한 스타일링 DNA로 설계되어 있어, 커플 내러티브·
            남녀 라인 동시 런칭·시리즈 캐스팅을 하나의 브랜드 키트로 묶을 수
            있습니다.
          </p>
          <Link
            href="/character/brand-kits"
            className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
          >
            페어 브랜드 키트 보기 <ArrowRight className="w-3 h-3" />
          </Link>
        </section>

        <p className="text-xs text-zinc-500">
          모든 캐릭터는 AI 합성 모델입니다. 자세한 표기 정책은{" "}
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
