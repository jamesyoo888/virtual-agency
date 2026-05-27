import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Palette,
  Shirt,
  Quote,
} from "lucide-react";
import {
  CHARACTERS,
  getCharacter,
  type CharacterSlug,
} from "@/lib/characters/registry";
import {
  breadcrumbLd,
  characterPersonLd,
  faqPageLd,
  ldScript,
} from "@/lib/seo/json-ld";
import { BRAND_KIT_TIERS, formatKrw } from "@/lib/characters/brand-kits";
import { characterFaqKo } from "@/lib/characters/faq";
import { glossaryForCharacter } from "@/lib/characters/glossary-links";
import { relatedPostsForIndustry } from "@/lib/blog/industry-map";
import { listSeries } from "@/lib/blog/series";
import { trackCharacterView } from "@/lib/analytics/track-character-view";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export function generateStaticParams(): Array<{ slug: CharacterSlug }> {
  return CHARACTERS.map((c) => ({ slug: c.slug }));
}

const KO_LORE: Record<string, string> = {
  yuna:
    "유나는 24세의 가상 K-aesthetic 모델로, 글로벌 뷰티·패션·테크·라이프스타일 브랜드가 서울 비주얼 레지스터를 활용할 수 있도록 설계되었습니다. 쿨·소프트 피처·듀이한 느낌이 특징이며, 한 캠페인이 뉴욕·베를린·싱가포르 어디서든 자연스럽게 어울리도록 만들어졌습니다.",
  ren:
    "렌은 26세의 가상 K-aesthetic 남성 모델로, K-pop 비주얼 레지스터(샤프한 턱선, 또렷한 눈매, 절제된 에디토리얼 표정)를 K-pop 직접 차용 없이 구현한 캐릭터입니다. 글로벌 향수·시계·패션·모터스포츠 캠페인을 겨냥했고, 유나와 동일한 스타일링 DNA로 페어 캠페인이 가능합니다.",
};

const KO_PERSONA: Record<string, string> = {
  yuna: "조용한 자신감, 단정한 뷰티 룩, 차분한 에디토리얼 레인지. 미니멀하고 프리미엄한 인상.",
  ren: "차분하고 약간 시네마틱한 무드. 샤프·프리미엄·마스큘린하지만 공격적이지 않음. 향수·시계·럭셔리 멘즈웨어에 강점.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = getCharacter(slug);
  if (!character) return { title: "캐릭터 — Virtual Agency" };

  const title = `${character.name} — Virtual Agency 캐릭터`;
  const description = `${KO_PERSONA[character.slug] ?? character.persona} ${character.targetVerticals.join("·")} 광고에 활용 가능한 K-aesthetic AI 합성 모델.`;
  const ogImage = `${SITE_URL}/api/og?character=${character.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/character/${character.slug}`,
      languages: {
        ko: `${SITE_URL}/character/${character.slug}`,
        en: `${SITE_URL}/en/character/${character.slug}`,
      },
    },
    openGraph: {
      title: `${character.name} — Virtual Agency`,
      description,
      url: `${SITE_URL}/character/${character.slug}`,
      locale: "ko_KR",
      type: "profile",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${character.name} — Virtual Agency`,
      description,
      images: [ogImage],
    },
  };
}

export default async function KrCharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = getCharacter(slug);
  if (!character) notFound();

  void trackCharacterView(character.slug, "ko");

  const otherCharacters = CHARACTERS.filter((c) => c.slug !== character.slug);
  const personLd = characterPersonLd(character);
  const crumbsLd = breadcrumbLd([
    { name: "홈", url: SITE_URL },
    { name: "캐릭터", url: `${SITE_URL}/character` },
    { name: character.name, url: `${SITE_URL}/character/${character.slug}` },
  ]);
  const faqEntries = characterFaqKo(character);
  const faqLd = faqPageLd(faqEntries);
  const primaryVertical = character.targetVerticals[0];
  const relatedPosts = primaryVertical
    ? relatedPostsForIndustry(primaryVertical, 3, "ko")
    : [];
  const glossaryTerms = glossaryForCharacter(character);
  const characterSeries = listSeries("ko").find((s) => s.id === "character-ip");

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbsLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(faqLd) }}
      />
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/character"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> 캐릭터 로스터
        </Link>

        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            캐릭터 · K-aesthetic AI 합성 모델
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            {character.name}
          </h1>
          <p className="text-xl text-zinc-400 mt-2">{character.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {character.age}세
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {character.gender === "female"
                ? "여성"
                : character.gender === "male"
                ? "남성"
                : "논바이너리"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
              «AI Synthetic»
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {character.introducedAt} 데뷔
            </span>
          </div>
        </header>

        <section className="mb-16">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-3">
            로어
          </h2>
          <p className="text-zinc-300 leading-relaxed text-base md:text-lg">
            {KO_LORE[character.slug] ?? character.lore}
          </p>
        </section>

        <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                페르소나
              </p>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {KO_PERSONA[character.slug] ?? character.persona}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                라이팅 레시피
              </p>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {character.aesthetic.lighting}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                팔레트 앵커
              </p>
            </div>
            <ul className="text-sm text-zinc-300 space-y-1">
              {character.aesthetic.palette.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Shirt className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                워드로브 레지스터
              </p>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {character.aesthetic.wardrobe}
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-3">
            적합한 산업
          </h2>
          <div className="flex flex-wrap gap-2">
            {character.targetVerticals.map((v) => (
              <Link
                key={v}
                href={`/explore/${v}`}
                className="px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                {v}
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            납품 형태
          </p>
          <ul className="text-sm text-zinc-300 space-y-2 leading-relaxed">
            <li>· <span className="text-zinc-400">파일 형식:</span> RAW 16-bit TIFF + 압축 JPG. PSD layered (보정 가능 상태).</li>
            <li>· <span className="text-zinc-400">해상도:</span> PDP 3000×4000 / OOH 6000×9000 / 9:16 reels 1080×1920.</li>
            <li>· <span className="text-zinc-400">컷 수:</span> 1차 컨셉 시트 (24h) → 풀 셋 5컷 (3–5일) → 추가 시 컷당 견적.</li>
            <li>· <span className="text-zinc-400">리비전:</span> 컷별 2회 무료 — 컬러·크롭·소품. 컨셉 변경은 새 라운드.</li>
            <li>· <span className="text-zinc-400">합성 표기:</span> EU AI Act / FTC / ASA / 방심위 4개 시장 메타데이터 모든 파일에 동봉.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40 mb-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            예상 투자 규모
          </p>
          <ul className="text-sm text-zinc-300 space-y-2">
            {BRAND_KIT_TIERS.map((tier) => (
              <li
                key={tier.slug}
                className="flex justify-between gap-3 border-b border-zinc-900 last:border-b-0 pb-2 last:pb-0"
              >
                <span className="text-zinc-400">{tier.nameKo}</span>
                <span className="tabular-nums">
                  {formatKrw(tier.krw, tier.startingAt)}
                  <span className="text-zinc-600 text-xs ml-1">/ 분기</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/character/brand-kits"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
            >
              전체 키트 구성 보기 <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href={`/character/${character.slug}/lookbook`}
              className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-100"
            >
              {character.name} 분기 룩북 구조 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-zinc-600 leading-relaxed">
            티어별 산출물·독점성 차이는 브랜드 키트 페이지에서 확인하세요.
            솔로 캠페인은 일별 라이선스로 별도 견적합니다.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40 mb-12">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            라이선스
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            카테고리별 분기 단위 독점 라이선스 가능. 앰배서더 스타일의 브랜드
            키트에 적합합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/rfp?campaign=${encodeURIComponent(character.name + " 캠페인")}&exclusive=true&utm_source=character&utm_campaign=character_${character.slug}`}
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
            >
              RFP 보내기 <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href={`/match?industries=${character.targetVerticals[0] ?? ""}&moods=${character.defaultMoods[0] ?? ""}&utm_source=character&utm_campaign=character_${character.slug}`}
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              유사한 모델 매칭
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              가격 보기
            </Link>
          </div>
        </section>

        {glossaryTerms.length > 0 && (
          <section className="mb-12 rounded-xl border border-zinc-900 bg-zinc-950/40 p-6">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2 className="text-sm uppercase tracking-wider text-zinc-500">
                이 페이지의 용어
              </h2>
              <Link
                href="/glossary"
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                전체 용어집 →
              </Link>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {glossaryTerms.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/glossary#${t.slug}`}
                    className="block rounded-md border border-zinc-900 bg-black/40 px-3 py-2 hover:border-zinc-700"
                  >
                    <span className="text-zinc-200">{t.ko.term}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {characterSeries && characterSeries.slugs.length > 0 && (
          <section className="mb-12">
            <Link
              href={`/blog/series/${characterSeries.id}`}
              className="block rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 hover:border-violet-400/50 hover:bg-violet-500/10 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300 mb-2">
                블로그 시리즈 · {characterSeries.slugs.length}편
              </p>
              <p className="text-base font-semibold text-zinc-100">
                {characterSeries.title}
              </p>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                {characterSeries.description}
              </p>
              <p className="mt-3 text-xs text-violet-300 inline-flex items-center gap-1">
                시리즈 전체 보기 <ArrowRight className="w-3 h-3" />
              </p>
            </Link>
          </section>
        )}

        {relatedPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
              관련 읽을거리
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {relatedPosts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 hover:border-zinc-700 transition-colors h-full"
                  >
                    <p className="text-sm font-semibold text-zinc-200 leading-tight">
                      {p.title}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                      {p.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
            자주 묻는 질문
          </h2>
          <dl className="divide-y divide-zinc-900 border-y border-zinc-900">
            {faqEntries.map((entry) => (
              <div key={entry.question} className="py-4">
                <dt className="text-sm font-semibold text-zinc-200">
                  {entry.question}
                </dt>
                <dd className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {entry.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {otherCharacters.length > 0 && (
          <section className="border-t border-zinc-900 pt-8">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
              다른 캐릭터
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherCharacters.map((c) => (
                <Link
                  key={c.slug}
                  href={`/character/${c.slug}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600 transition-colors"
                >
                  <p className="text-lg font-semibold">{c.name}</p>
                  <p className="text-sm text-zinc-400 mt-1">{c.tagline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-[11px] text-zinc-600 leading-relaxed">
          {character.name}은 AI 합성 모델입니다. 시장별 표기 의무는{" "}
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
