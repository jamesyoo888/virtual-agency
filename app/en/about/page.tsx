import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "About ??Virtual Agency",
  description:
    "Virtual Agency is a production studio for AI-generated K-aesthetic models. We build talent that scales with global campaigns ??built on our own GPU infrastructure.",
  alternates: {
    canonical: `${SITE_URL}/en/about`,
    languages: {
      en: `${SITE_URL}/en/about`,
      ko: `${SITE_URL}/about`,
    },
  },
  openGraph: {
    title: "About ??Virtual Agency",
    description: "A production studio for K-aesthetic talent ??built on our own GPUs.",
    url: `${SITE_URL}/en/about`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_about=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "About ??Virtual Agency",
    description: "K-aesthetic production studio.",
    images: [`${SITE_URL}/api/og?en_about=1`],
  },
};

function Principle({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-900 p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mb-2">
        {n}
      </p>
      <p className="font-semibold text-zinc-100 mb-2">{title}</p>
      <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}

export default function EnAboutPage() {
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

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 mb-4">
          About
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
          A production studio for K-aesthetic talent ??built on our own GPUs.
        </h1>
        <p className="text-zinc-300 text-base md:text-lg leading-relaxed mb-12">
          Virtual Agency makes synthetic models that global brands can license,
          campaign by campaign. We focus on K-aesthetic because that&apos;s
          where global demand is moving ??and because we run the production
          pipeline end-to-end, not as a SaaS layer over someone else&apos;s API.
        </p>

        <h2 className="text-xl font-semibold mb-4">Operating principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Principle
            n="01"
            title="Production-grade, not novelty"
            body="Every model has a portfolio, a brief template, a license, and a delivery SLA. We don't ship demos."
          />
          <Principle
            n="02"
            title="Always disclosed"
            body="Synthetic by default in every surface ??model page, OG card, quote PDF, alt text, and JSON-LD."
          />
          <Principle
            n="03"
            title="Own the pipeline"
            body="Inference runs on our GPUs. Marginal cost approaches electricity, so a global brand can scale without a per-seat tax."
          />
          <Principle
            n="04"
            title="Operational depth"
            body="Lead time, bottleneck, at-risk client, cohort retention ??we track the same dashboards a real ops team would, so the campaigns ship on time."
          />
        </div>

        <h2 className="text-xl font-semibold mb-3">How we work</h2>
        <ul className="list-disc list-inside text-zinc-300 space-y-1.5 leading-relaxed mb-12">
          <li>You send a brief or pick from the catalog</li>
          <li>We respond with a written quote within 24 hours</li>
          <li>Production runs through tracked stages in your client dashboard</li>
          <li>
            Deliverables ship with disclosure metadata; license starts on
            delivery
          </li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">Infrastructure</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-12">
          We run a self-hosted Supabase stack for data, a private GPU cluster
          for inference, and Vercel for delivery. Cron-driven email digests,
          per-stage analytics, and an audit log keep operations honest. The
          stack is purpose-built for a small team running many concurrent
          brand engagements.
        </p>

        <div className="border-t border-zinc-900 pt-8">
          <p className="text-sm text-zinc-500 mb-4">Talk to us</p>
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
              href="/en/pricing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
            >
              See pricing
            </Link>
            <a
              href="mailto:hello@aihubs.uk?subject=Hello"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
            >
              hello@aihubs.uk
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
