import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Palette,
  Lightbulb,
  Shirt,
  Construction,
} from "lucide-react";
import { CHARACTERS, getCharacter, type CharacterSlug } from "@/lib/characters/registry";
import { lookbookForCharacter } from "@/lib/characters/lookbook";
import { breadcrumbLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export function generateStaticParams(): Array<{ slug: CharacterSlug }> {
  return CHARACTERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = getCharacter(slug);
  if (!character) return { title: "룩북 — Virtual Agency" };
  const title = `${character.name} 룩북 — Virtual Agency`;
  const description = `${character.name} 캐릭터의 분기 룩북 컨셉 ${
    lookbookForCharacter(character.slug).length
  }종. 무드·의상·라이팅·납품 컷 수가 정리된 구조.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/character/${character.slug}/lookbook`,
      languages: {
        ko: `${SITE_URL}/character/${character.slug}/lookbook`,
        en: `${SITE_URL}/en/character/${character.slug}/lookbook`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/character/${character.slug}/lookbook`,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function KrCharacterLookbookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = getCharacter(slug);
  if (!character) notFound();
  const concepts = lookbookForCharacter(character.slug);

  const crumbsLd = breadcrumbLd([
    { name: "Home", url: SITE_URL },
    { name: "캐릭터", url: `${SITE_URL}/character` },
    { name: character.name, url: `${SITE_URL}/character/${character.slug}` },
    { name: "룩북", url: `${SITE_URL}/character/${character.slug}/lookbook` },
  ]);

  const totalHero = concepts.reduce((s, c) => s + c.heroShots, 0);
  const totalSupporting = concepts.reduce((s, c) => s + c.supportingShots, 0);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbsLd) }}
      />
      <article className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <Link
          href={`/character/${character.slug}`}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> {character.name} 프로필로
        </Link>

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300 mb-3">
            룩북 — 분기 컨셉 구조
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {character.name} 분기 룩북
          </h1>
          <p className="text-zinc-400 mt-3 leading-relaxed">
            한 분기 동안 어떤 컨셉이 어떻게 묶여 납품되는지 — 무드·의상·라이팅·컷 수까지 모두 명시된 구조도입니다. 실제 자산은 분기 brand-kit 계약 시 렌더링됩니다.
          </p>
        </header>

        <section className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <Construction className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-100">
                자산은 분기 계약 시 렌더링
              </p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                이 페이지는 컨셉 시트 구조만 노출됩니다. 실제 컷은 brand-kit 계약 후 렌더링되어 광고주 전용 워크룸으로 납품됩니다 — 컨셉을 검토하고 변경 사항을 함께 결정한 다음 시작합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Stat label="컨셉 시트" value={concepts.length.toString()} hint="분기당" />
          <Stat label="히어로 컷" value={totalHero.toString()} hint="합계" />
          <Stat label="서포팅 컷" value={totalSupporting.toString()} hint="합계" />
          <Stat
            label="총 납품"
            value={(totalHero + totalSupporting).toString()}
            hint="히어로 + 서포팅"
          />
        </section>

        <div className="space-y-8">
          {concepts.map((c, idx) => (
            <section
              key={c.id}
              id={c.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 scroll-mt-20"
            >
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 tabular-nums">
                  Concept {String(idx + 1).padStart(2, "0")}
                </span>
                <h2 className="text-xl font-semibold">{c.titleKo}</h2>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-5">
                {c.briefKo}
              </p>
              <ul className="space-y-3 text-sm">
                <Row
                  icon={<Palette className="w-3.5 h-3.5 text-violet-300" />}
                  label="무드"
                  value={c.mood.join(" · ")}
                />
                <Row
                  icon={<Shirt className="w-3.5 h-3.5 text-violet-300" />}
                  label="의상"
                  value={c.wardrobeKo}
                />
                <Row
                  icon={<Lightbulb className="w-3.5 h-3.5 text-violet-300" />}
                  label="라이팅"
                  value={c.lighting}
                />
                <Row
                  icon={<Camera className="w-3.5 h-3.5 text-violet-300" />}
                  label="납품 컷"
                  value={`히어로 ${c.heroShots} · 서포팅 ${c.supportingShots}`}
                />
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-zinc-900">
          <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
            <p className="text-sm text-zinc-300">
              이 컨셉 구조로 분기 brand-kit 시작
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/rfp?character=${character.slug}&utm_source=character&utm_campaign=character_${character.slug}`}
                className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
              >
                RFP 보내기
              </Link>
              <Link
                href="/character/brand-kits"
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                Brand-kit 티어 보기
              </Link>
              <Link
                href={`/character/${character.slug}`}
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                {character.name} 프로필
              </Link>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-violet-200">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="w-16 shrink-0 text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className="text-zinc-300">{value}</span>
    </li>
  );
}
