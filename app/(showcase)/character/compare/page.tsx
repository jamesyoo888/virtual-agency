import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCharacters } from "@/lib/characters/registry";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "유나 vs 렌 — 캐릭터 비교 · Virtual Agency",
  description:
    "유나와 렌의 페르소나·라이팅·팔레트·산업 적합도를 한 화면에서 비교. 솔로 캐스팅과 페어 브랜드 키트 선택을 위한 가이드.",
  alternates: {
    canonical: `${SITE_URL}/character/compare`,
    languages: {
      ko: `${SITE_URL}/character/compare`,
      en: `${SITE_URL}/en/character/compare`,
    },
  },
  openGraph: {
    title: "유나 vs 렌 — 캐릭터 비교",
    description: "두 K-aesthetic 캐릭터를 한 화면에서 비교.",
    url: `${SITE_URL}/character/compare`,
    locale: "ko_KR",
    type: "website",
    images: [`${SITE_URL}/api/og?character_compare=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "유나 vs 렌 — 캐릭터 비교",
    description: "두 K-aesthetic 캐릭터를 한 화면에서 비교.",
    images: [`${SITE_URL}/api/og?character_compare=1`],
  },
};

const KO_PERSONA: Record<string, string> = {
  yuna: "조용한 자신감, 단정한 뷰티 룩, 차분한 에디토리얼 레인지.",
  ren: "차분하고 약간 시네마틱한 무드. 샤프·프리미엄·마스큘린하지만 공격적이지 않음.",
};

const KO_BEST_FOR: Record<string, string> = {
  yuna: "뷰티 PDP, 패션 에디토리얼, 럭셔리 fragrance, 테크 라이프스타일",
  ren: "fragrance & 시계, 럭셔리 멘즈웨어, 모터스포츠, 시네마틱 광고",
};

export default function KrCharacterComparePage() {
  const characters = listCharacters();
  const ld = itemListLd(
    "Virtual Agency 캐릭터 비교",
    characters.map((c) => ({
      name: c.name,
      url: `${SITE_URL}/character/${c.slug}`,
    }))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/character"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          ← 캐릭터 로스터
        </Link>

        <header className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            캐릭터 비교
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {characters.map((c) => c.name).join(" vs ")}
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            솔로 캐스팅과 페어 브랜드 키트 사이에서 고민될 때 한 화면에서
            비교하세요. 같은 스타일링 DNA로 설계되었지만, 적합한 산업·무드·
            라이팅 레지스터가 다릅니다.
          </p>
        </header>

        <section className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40 mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-zinc-500 font-normal w-32">
                  속성
                </th>
                {characters.map((c) => (
                  <th
                    key={c.slug}
                    className="text-left p-4 font-semibold text-zinc-100"
                  >
                    <Link
                      href={`/character/${c.slug}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs font-normal text-zinc-500 mt-0.5">
                      {c.tagline}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              <tr>
                <td className="p-4 text-zinc-500 align-top">기본</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.age}세 · {c.gender === "female" ? "여성" : c.gender === "male" ? "남성" : "논바이너리"} · {c.introducedAt} 데뷔
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">페르소나</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {KO_PERSONA[c.slug] ?? c.persona}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">라이팅</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.aesthetic.lighting}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">팔레트</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.aesthetic.palette.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">워드로브</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.aesthetic.wardrobe}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">산업</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.targetVerticals.map((v) => (
                        <Link
                          key={v}
                          href={`/explore/${v}`}
                          className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white"
                        >
                          {v}
                        </Link>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">무드</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.defaultMoods.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">적합한 케이스</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {KO_BEST_FOR[c.slug] ?? c.targetVerticals.join(", ")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">라이선스</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.licensingNote}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-300 mb-2">
            페어 브랜드 키트
          </p>
          <p className="text-zinc-200 font-semibold mb-1">
            두 캐릭터는 동일한 스타일링 DNA로 설계되어 있습니다.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            한 시즌에 두 얼굴이 모두 필요한 브랜드는 페어 키트가 단가가 더
            유리합니다. 커플 내러티브·남녀 동시 런칭·시리즈 캐스팅에 적합.
          </p>
          <Link
            href="/character/brand-kits"
            className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
          >
            페어 키트 가격 보기 <ArrowRight className="w-3 h-3" />
          </Link>
        </section>

        <footer className="flex flex-wrap gap-3 pt-6 border-t border-zinc-900">
          <Link
            href="/rfp?campaign=캐릭터 캠페인"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            RFP 보내기
          </Link>
          <Link
            href="/character"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            로스터로
          </Link>
          <Link
            href="/match"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            매칭 엔진
          </Link>
        </footer>
      </main>
    </div>
  );
}
