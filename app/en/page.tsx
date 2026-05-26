import type { Metadata } from "next";
import Link from "next/link";
import { loadSocialProof } from "@/lib/social-proof";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "K-Aesthetic AI Virtual Models for Global Brands — Virtual Agency",
  description:
    "Cast in 24 hours. Deliver in days. License per campaign. Production-grade AI virtual models built for global brands tapping K-aesthetic.",
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: {
      en: `${SITE_URL}/en`,
      ko: `${SITE_URL}/`,
    },
  },
  openGraph: {
    title: "K-Aesthetic AI Virtual Models for Global Brands",
    description:
      "Cast in 24 hours. Deliver in days. License per campaign.",
    url: `${SITE_URL}/en`,
    locale: "en_US",
    type: "website",
  },
};

function Value({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-900 p-5">
      <p className="text-[10px] tracking-[0.3em] text-zinc-600 mb-3">{n}</p>
      <p className="font-semibold text-zinc-100 mb-1.5">{title}</p>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default async function EnHomePage() {
  const socialProof = await loadSocialProof();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <Link
          href="/en"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link href="/en/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/en/about" className="hover:text-white">
            About
          </Link>
          <Link
            href="/"
            className="hover:text-white border border-zinc-800 rounded-md px-2 py-0.5 text-xs"
          >
            한국어
          </Link>
        </nav>
      </header>

      <div className="px-5 md:px-8 py-12 md:py-20 border-b border-zinc-900">
        <div className="max-w-3xl">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-4">
            K-Aesthetic AI Model Agency
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-4">
            Perfect models, <br />
            <span className="text-zinc-400">available 24/7.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Production-grade AI virtual models built for global brands tapping
            K-aesthetic. Cast in 24 hours, deliver in days, license per
            campaign — no agents, no flights, no reshoots.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/en/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            See pricing →
          </Link>
          <a
            href="mailto:hello@virtualagency.example.com?subject=Campaign%20inquiry"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Request a campaign →
          </a>
          <Link
            href="/en/about"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            About us
          </Link>
        </div>

        {(socialProof.deliveredCount > 0 ||
          socialProof.activeModels > 0 ||
          socialProof.medianResponseHours !== null) && (
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            {socialProof.deliveredCount > 0 && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-zinc-100">
                  {socialProof.deliveredCount.toLocaleString()}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  campaigns delivered
                </span>
              </div>
            )}
            {socialProof.activeModels > 0 && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-zinc-100">
                  {socialProof.activeModels.toLocaleString()}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  active models
                </span>
              </div>
            )}
            {socialProof.medianResponseHours !== null && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-emerald-300">
                  {socialProof.medianResponseHours < 1
                    ? `${Math.round(socialProof.medianResponseHours * 60)}m`
                    : `${socialProof.medianResponseHours.toFixed(1)}h`}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  median response (7d)
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-5xl">
          <Value
            n="01"
            title="Brand consistency"
            desc="Same model, every season, every campaign — no drift in face or tone."
          />
          <Value
            n="02"
            title="Flexible licensing"
            desc="Daily, multi-day, exclusive, or category-locked — terms shown up front in the catalog."
          />
          <Value
            n="03"
            title="Fast production cycle"
            desc="Images 2–3 days, video 3–5 days. Track each stage in the client dashboard."
          />
        </div>
      </div>

      <section className="px-5 md:px-8 py-12 md:py-16 border-b border-zinc-900">
        <div className="max-w-4xl">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-4">
            Built for global brands using K-aesthetic
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed mb-6">
            K-pop, K-drama, and K-beauty have made &laquo;K-aesthetic&raquo; a
            globally recognized visual language. We give brands a production
            layer to use it — fictional, AI-generated talent that is on-brand,
            on-message, and on-schedule, without the cost or coordination of a
            traditional shoot.
          </p>
          <p className="text-zinc-500 text-sm leading-relaxed">
            All output is clearly disclosed as synthetic. We follow EU AI Act
            Article 50, the US FTC Endorsement Guides, and UK ASA / CAP Code.
            See our{" "}
            <Link
              href="/en/legal/ai-disclosure"
              className="underline hover:text-white"
            >
              compliance disclosure
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="px-5 md:px-8 py-12 md:py-16">
        <div className="max-w-4xl">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-6">
            Three common engagements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-900 p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mb-2">
                Social burst
              </p>
              <p className="text-2xl font-bold text-white mb-1">~ $1,500</p>
              <p className="text-xs text-zinc-500 mb-3">
                3-day non-exclusive · 5 hero stills · social-cropped
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Launch a single drop or react to a moment. Same-week delivery.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-900 p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mb-2">
                Seasonal lookbook
              </p>
              <p className="text-2xl font-bold text-white mb-1">~ $5,500</p>
              <p className="text-xs text-zinc-500 mb-3">
                14-day · 20 stills · 3 lifestyle scenes · 1 short video
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Quarterly campaign with consistent talent across web, social,
                and email.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-900 p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mb-2">
                Launch campaign
              </p>
              <p className="text-2xl font-bold text-white mb-1">~ $20,000</p>
              <p className="text-xs text-zinc-500 mb-3">
                90-day exclusive · full kit · custom scenes · 3 videos
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Anchor talent for a global product launch, locked to your
                category.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/en/pricing"
              className="text-sm text-zinc-300 underline hover:text-white"
            >
              Full pricing breakdown →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
