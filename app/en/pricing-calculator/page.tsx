import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { PricingCalculator } from "@/components/pricing-calculator";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "Campaign cost estimator — Virtual Agency",
  description:
    "4 inputs (asset count · season · markets · exclusivity) → instant estimate and recommended path for K-aesthetic AI campaigns. Includes traditional shoot benchmark.",
  alternates: {
    canonical: `${SITE_URL}/en/pricing-calculator`,
    languages: {
      en: `${SITE_URL}/en/pricing-calculator`,
      ko: `${SITE_URL}/pricing-calculator`,
    },
  },
  openGraph: {
    title: "Campaign cost estimator — Virtual Agency",
    description: "4 inputs → instant estimate for K-aesthetic AI campaigns.",
    url: `${SITE_URL}/en/pricing-calculator`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?en_pricing=1`],
  },
};

export default function PricingCalculatorEnPage() {
  return (
    <div className="min-h-screen text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <Link
          href="/en/pricing"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to pricing
        </Link>
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs text-emerald-300 mb-3">
            <Calculator className="w-4 h-4" />
            Cost estimator
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            K-aesthetic AI campaign cost
          </h1>
          <p className="mt-3 text-zinc-400 max-w-2xl leading-relaxed">
            4 inputs — asset count, season length, market count, exclusivity
            — surface a recommended path plus a KRW/USD range. Includes the
            traditional shoot benchmark for the same scope. Run this before
            sending an RFP.
          </p>
        </header>

        <PricingCalculator locale="en" />

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Card
            title="How the math works"
            body="Same 4-input framework we use internally for deal sizing. The «K-aesthetic campaign ROI calculator» blog post has 5 worked examples — they cover the most common buyer scenarios."
          />
          <Card
            title="Confidence band"
            body="Real estimates land within ±20% of these numbers. ⅔ of campaigns finish inside the range. If your scope is fuzzy, the RFP form has room to add detail."
          />
          <Card
            title="What's not included"
            body="Media budget and legal review (face-similarity audit · multi-market disclosure) are separate. Media is typically 70-85% of total campaign cost; this calculator is the asset + license portion."
          />
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400 leading-relaxed">
          <p className="font-medium text-zinc-200 mb-2">
            Why a calculator, not a price sheet?
          </p>
          <p>
            When a buyer asks &laquo;how much does a K-aesthetic AI campaign
            cost?&raquo; the honest answer is &laquo;it depends&raquo; — the
            range spans $4K to $180K based on 4 inputs. A price sheet shows
            the middle and matches nobody; a single quote creates mismatched
            expectations on both sides. The calculator gives both sides an
            honest baseline.{" "}
            <Link
              href="/en/blog/k-aesthetic-campaign-roi-calculator-framework"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              Framework post
            </Link>{" "}
            ·{" "}
            <Link
              href="/en/blog/brand-kit-roi-worked-example-paired-vs-solo"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              Worked example (paired vs solo)
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
        {title}
      </p>
      <p className="text-zinc-300 leading-relaxed">{body}</p>
    </div>
  );
}
