import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { BRAND_KIT_TIERS, formatUsd } from "@/lib/characters/brand-kits";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Pricing — Virtual Agency",
  description:
    "USD pricing for Virtual Agency AI virtual models. Per-day licensing, exclusive bundles, and three illustrative scenarios for social, lookbook, and launch campaigns.",
  alternates: {
    canonical: `${SITE_URL}/en/pricing`,
    languages: {
      en: `${SITE_URL}/en/pricing`,
      ko: `${SITE_URL}/pricing`,
    },
  },
  openGraph: {
    title: "Pricing — Virtual Agency",
    description: "USD pricing, Stripe billing, three illustrative scenarios.",
    url: `${SITE_URL}/en/pricing`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_pricing=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Virtual Agency",
    description: "USD pricing, Stripe billing.",
    images: [`${SITE_URL}/api/og?en_pricing=1`],
  },
};

function Tier({
  label,
  price,
  description,
  bullets,
  highlight,
}: {
  label: string;
  price: string;
  description: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-violet-500/50 bg-violet-500/5"
          : "border-zinc-900"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
        {label}
      </p>
      <p className="text-3xl font-bold text-white mb-1">{price}</p>
      <p className="text-sm text-zinc-400 mb-5">{description}</p>
      <ul className="text-sm text-zinc-300 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-zinc-600">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Scenario({
  title,
  total,
  breakdown,
  use,
}: {
  title: string;
  total: string;
  breakdown: { label: string; amount: string }[];
  use: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 p-5">
      <p className="text-sm text-zinc-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white mb-3">{total}</p>
      <ul className="text-xs text-zinc-400 space-y-1 mb-3 border-t border-zinc-900 pt-3">
        {breakdown.map((row) => (
          <li key={row.label} className="flex justify-between">
            <span>{row.label}</span>
            <span className="tabular-nums text-zinc-300">{row.amount}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500 leading-relaxed">{use}</p>
    </div>
  );
}

export default function EnPricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5">
        <Link
          href="/en"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 mb-4">
          Pricing
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          One day. One model. One license.
        </h1>
        <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl mb-6">
          Prices below are illustrative USD. Final quotes account for exclusivity,
          territory, channel, and post-production. Quoted in under 24 hours;
          paid via Stripe or wire.
        </p>
        <Link
          href="/en/pricing-calculator?utm_source=pricing-page&utm_campaign=pricing_hero"
          className="mb-12 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm font-medium hover:bg-emerald-500/20"
        >
          Cost estimator — 4 inputs, instant range →
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <Tier
            label="Base license"
            price="$300 / day"
            description="Non-exclusive, single-channel use. Most catalog talent."
            bullets={[
              "Per-day pricing, no minimums",
              "5 hero stills included",
              "Same-week delivery for simple briefs",
              "Web + social use",
            ]}
          />
          <Tier
            label="Exclusive campaign"
            price="$2,500+ / month"
            description="Category-locked talent for 30 / 60 / 90 days."
            bullets={[
              "Competitor lock in your category",
              "Reusable across multiple deliverables",
              "Stripe Subscriptions billing supported",
              "Bundled video at 30% discount",
            ]}
            highlight
          />
          <Tier
            label="Custom build"
            price="From $8,000"
            description="Brand-specific synthetic talent built from your brief."
            bullets={[
              "Original face & wardrobe direction",
              "Multi-scene narrative output",
              "Optional Instagram persona",
              "Full IP transfer optional",
            ]}
          />
        </div>

        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2">
          Three real campaign sizes
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Line items are typical, not contractual — your quote will reflect your
          specific brief.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <Scenario
            title="Social burst"
            total="$1,500"
            breakdown={[
              { label: "3-day non-exclusive license", amount: "$900" },
              { label: "5 hero stills", amount: "$300" },
              { label: "Social crop + caption hints", amount: "$300" },
            ]}
            use="A single SKU drop or trend reaction. Quote — delivery in a week."
          />
          <Scenario
            title="Seasonal lookbook"
            total="$5,500"
            breakdown={[
              { label: "14-day non-exclusive license", amount: "$2,800" },
              { label: "20 stills (web + social cuts)", amount: "$1,200" },
              { label: "3 lifestyle scenes", amount: "$900" },
              { label: "1 short video (15s)", amount: "$600" },
            ]}
            use="Quarterly K-beauty or fashion campaign with same-talent consistency."
          />
          <Scenario
            title="Launch campaign"
            total="$20,000"
            breakdown={[
              { label: "90-day exclusive (your category)", amount: "$12,000" },
              { label: "Full kit (50 stills + crops)", amount: "$4,000" },
              { label: "3 hero videos (15-30s)", amount: "$3,000" },
              { label: "Persona Instagram (90 days)", amount: "$1,000" },
            ]}
            use="Anchor talent for a global product launch — locked competitor-out for the launch window."
          />
        </div>

        <div className="mb-16">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2 inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-300" />
            Character IP brand-kits
          </h2>
          <p className="text-sm text-zinc-500 mb-6 max-w-2xl leading-relaxed">
            Catalog licensing (above) is per-model, per-day. Brand-kits (below) bundle Yuna + Ren under shared styling DNA for an entire quarter — pick a kit when you need season-over-season consistency instead of one-off variety.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BRAND_KIT_TIERS.map((tier) => (
              <article
                key={tier.slug}
                className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 flex flex-col"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300">
                  {tier.characters}
                </p>
                <h3 className="text-base font-semibold mt-1 mb-3">
                  {tier.nameEn}
                </h3>
                <p className="text-2xl font-bold tabular-nums mb-1 text-violet-100">
                  {formatUsd(tier.usd, tier.startingAt)}
                </p>
                <p className="text-[11px] text-zinc-500 mb-4">/ quarter</p>
                <Link
                  href={`/en/character/brand-kits?utm_source=character&utm_campaign=brand_kit_${tier.slug}`}
                  className="mt-auto inline-flex items-center justify-center gap-1 text-xs rounded-md border border-violet-500/40 px-3 py-1.5 text-violet-200 hover:bg-violet-500/10"
                >
                  {tier.nameEn} details <ArrowRight className="w-3 h-3" />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-3">
          How it works
        </h2>
        <ol className="list-decimal list-inside text-zinc-300 space-y-1.5 mb-12 leading-relaxed">
          <li>
            Send a brief (or pick a model from the catalog) — we reply with a
            quote PDF within 24 hours.
          </li>
          <li>
            Pay via Stripe Checkout (USD, EUR, SGD) or wire. Stripe Tax is
            applied for EU and US clients.
          </li>
          <li>Track production stages in your client dashboard.</li>
          <li>
            We deliver hero stills, social crops, and any video. License starts
            on delivery.
          </li>
        </ol>

        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-3">
          What we never charge for
        </h2>
        <ul className="list-disc list-inside text-zinc-400 space-y-1 leading-relaxed mb-12">
          <li>Initial brief review and quote</li>
          <li>One round of revisions per deliverable</li>
          <li>Synthetic disclosure metadata (always included)</li>
          <li>Standard alt text and accessibility tagging</li>
        </ul>

        <div className="border-t border-zinc-900 pt-8 mt-12">
          <p className="text-sm text-zinc-500 mb-4">Ready to start?</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/en/rfp"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
            >
              Send a brief
            </Link>
            <Link
              href="/en/match"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
            >
              Match a model
            </Link>
            <Link
              href="/en/legal/ai-disclosure"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
            >
              Compliance disclosure
            </Link>
          </div>

          <p className="mt-8 text-xs text-zinc-500 max-w-3xl">
            New to vocabulary like «brand kit», «category exclusivity», or
            «disclosure metadata»? The{" "}
            <Link
              href="/en/glossary"
              className="text-zinc-300 underline hover:text-white"
            >
              glossary
            </Link>{" "}
            defines all 14 terms used across pricing and contracts.
          </p>
        </div>
      </div>
    </div>
  );
}
