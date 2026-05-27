import type { Metadata } from "next";
import Link from "next/link";
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORY_LABELS,
  groupByCategory,
} from "@/lib/glossary/terms";
import { hasCharacterContext } from "@/lib/glossary/character-context";
import { definedTermSetLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "용어집 — K-aesthetic · 합성 모델 · 라이선스 · Virtual Agency",
  description:
    "K-aesthetic 광고 · AI 합성 모델 · 브랜드 키트 · 라이선스 용어 14가지를 정리한 레퍼런스. 광고주가 브리프를 쓰고 견적을 받기 전에 필요한 어휘.",
  alternates: {
    canonical: `${SITE_URL}/glossary`,
    languages: {
      ko: `${SITE_URL}/glossary`,
      en: `${SITE_URL}/en/glossary`,
    },
  },
  openGraph: {
    title: "용어집 · Virtual Agency",
    description: "K-aesthetic · 합성 모델 · 라이선스 용어 14가지.",
    url: `${SITE_URL}/glossary`,
    locale: "ko_KR",
    type: "website",
    images: [`${SITE_URL}/api/og?glossary=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "용어집 · Virtual Agency",
    description: "K-aesthetic · 합성 모델 · 라이선스 용어 14가지.",
    images: [`${SITE_URL}/api/og?glossary=1`],
  },
};

export default function KrGlossaryPage() {
  const ld = definedTermSetLd(
    "Virtual Agency 용어집 — K-aesthetic / 합성 모델",
    GLOSSARY_TERMS.map((t) => ({
      url: `${SITE_URL}/glossary#${t.slug}`,
      term: t.ko.term,
      description: t.ko.definition,
    }))
  );
  const groups = groupByCategory();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            레퍼런스
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            용어집
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl">
            K-aesthetic 광고 · AI 합성 모델 · 라이선스 · 운영 워크플로의 핵심
            어휘 14가지. 브리프를 쓸 때, 견적을 받을 때, 컴플라이언스 검토를
            할 때 참고하세요.
          </p>
        </header>

        <nav className="mb-12 rounded-xl border border-zinc-900 bg-zinc-950/40 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            카테고리별 바로가기
          </p>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.category}>
                <p className="text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5">
                  <a
                    href={`#cat-${g.category}`}
                    className="hover:text-zinc-400"
                  >
                    {GLOSSARY_CATEGORY_LABELS[g.category].ko}
                  </a>{" "}
                  <span className="text-zinc-700">· {g.entries.length}</span>
                </p>
                <ul className="flex flex-wrap gap-1.5 text-sm">
                  {g.entries.map((t) => (
                    <li key={t.slug}>
                      <a
                        href={`#${t.slug}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                      >
                        {t.ko.term}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="space-y-12">
          {groups.map((g) => (
            <section
              key={g.category}
              id={`cat-${g.category}`}
              className="scroll-mt-24"
            >
              <h2 className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-5">
                {GLOSSARY_CATEGORY_LABELS[g.category].ko}
              </h2>
              <dl className="space-y-8">
                {g.entries.map((t) => (
                  <div
                    key={t.slug}
                    id={t.slug}
                    className="scroll-mt-24 border-l-2 border-zinc-800 pl-5"
                  >
                    <dt className="text-lg font-semibold text-zinc-100">
                      {t.ko.term}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-400 leading-relaxed">
                      {t.ko.definition}
                    </dd>
                    {t.relatedPostSlug && (
                      <Link
                        href={`/blog/${t.relatedPostSlug}`}
                        className="mt-2 inline-block text-xs text-zinc-500 hover:text-zinc-300 underline"
                      >
                        관련 블로그 →
                      </Link>
                    )}
                    {hasCharacterContext(t.slug) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        실제 사례:{" "}
                        <Link
                          href="/character/yuna"
                          className="text-purple-300 hover:text-purple-200 underline"
                        >
                          Yuna
                        </Link>{" "}
                        ·{" "}
                        <Link
                          href="/character/ren"
                          className="text-purple-300 hover:text-purple-200 underline"
                        >
                          Ren
                        </Link>
                      </p>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-zinc-900 flex flex-wrap gap-3">
          <Link
            href="/rfp"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            RFP 보내기
          </Link>
          <Link
            href="/character"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            캐릭터 로스터
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            블로그
          </Link>
        </footer>
      </main>
    </div>
  );
}
