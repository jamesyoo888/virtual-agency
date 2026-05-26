import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { faqPageLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "FAQ — Virtual Agency",
  description:
    "Frequently asked questions on licensing, pricing, production timelines, compliance, and global use.",
  alternates: {
    canonical: `${SITE_URL}/en/faq`,
    languages: {
      en: `${SITE_URL}/en/faq`,
      ko: `${SITE_URL}/faq`,
    },
  },
  openGraph: {
    title: "FAQ — Virtual Agency",
    description:
      "AI virtual model licensing, pricing, turnaround, compliance, billing.",
    url: `${SITE_URL}/en/faq`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_faq=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — Virtual Agency",
    description: "Licensing, pricing, turnaround, compliance.",
    images: [`${SITE_URL}/api/og?en_faq=1`],
  },
};

interface QA {
  q: string;
  a: React.ReactNode;
  /** Plain-text answer used by the FAQPage JSON-LD; cannot contain markup. */
  aText: string;
}

const FAQ: QA[] = [
  {
    q: "How is pricing calculated?",
    a: (
      <p>
        Each model card lists a daily rate. Multi-day discounts apply
        automatically: 5% from 5 days, 10% from 10 days, 15% from 30 days.
        The model detail page has a live quote calculator; final pricing is
        confirmed in our written quote within 24 hours.
      </p>
    ),
    aText:
      "Each model card lists a daily rate. Multi-day discounts apply automatically (5% from 5 days, 10% from 10 days, 15% from 30 days). The model detail page has a live quote calculator; final pricing is confirmed in our written quote within 24 hours.",
  },
  {
    q: "Exclusive vs non-exclusive — what's the difference?",
    a: (
      <p>
        Exclusive licensing locks the model away from competitors in your
        category for the contract window. It typically prices 3–5x non-exclusive
        but is the right call when the model becomes part of your brand
        identity. Non-exclusive licensing lets the same model appear in other
        campaigns and is significantly cheaper.
      </p>
    ),
    aText:
      "Exclusive locks the model away from competitors in your category for the contract window. It typically prices 3–5x non-exclusive but is the right call when the model becomes part of your brand identity. Non-exclusive is significantly cheaper and allows concurrent campaigns.",
  },
  {
    q: "How long does production take?",
    a: (
      <p>
        Images and lookbooks: typically 2–4 business days. Video (5–30s):
        typically 3–5 business days. 3D assets and lip-sync: 5–7 business days.
        Every stage — inquiry → brief → in production → review → delivered —
        is visible in the client dashboard in real time.
      </p>
    ),
    aText:
      "Images and lookbooks: 2–4 business days. Video (5–30s): 3–5 business days. 3D assets and lip-sync: 5–7 business days. Every stage — inquiry → brief → in production → review → delivered — is visible in the client dashboard in real time.",
  },
  {
    q: "How does the AI matching work?",
    a: (
      <p>
        Send a brief and the matcher scores each model with a rule-based
        signal: industry fit (35pt), genre (25pt), mood (20pt), budget bonus,
        and a popularity weight. Each result shows the reasoning so you can
        cross-check the fit yourself.
      </p>
    ),
    aText:
      "Send a brief and the matcher scores each model with a rule-based signal: industry fit (35pt), genre (25pt), mood (20pt), budget bonus, and a popularity weight. Each result shows its reasoning.",
  },
  {
    q: "Where can the deliverables be used? Are there limits?",
    a: (
      <p>
        Use is bounded by the channels (social, OOH, print, web), regions,
        and timeframe stated in the license. Prohibited uses (deepfake
        impersonation, sexualized content, political endorsement, real-person
        likeness) are detailed in our{" "}
        <Link href="/legal/terms" className="underline hover:text-white">
          Terms of Service
        </Link>
        .
      </p>
    ),
    aText:
      "Use is bounded by the channels (social, OOH, print, web), regions, and timeframe stated in the license. Deepfake impersonation, sexualized content, political endorsement, and real-person likeness are prohibited.",
  },
  {
    q: "What is the refund policy?",
    a: (
      <p>
        Full refund before production begins. Once production is underway, we
        prorate based on stages completed. Once final delivery is signed off,
        the engagement is non-refundable.
      </p>
    ),
    aText:
      "Full refund before production begins. Once production is underway, we prorate based on stages completed. Once final delivery is signed off, the engagement is non-refundable.",
  },
  {
    q: "How many revisions are included?",
    a: (
      <p>
        Standard package: two free revision rounds at the review stage.
        Additional revisions are billed at $50–150 per round depending on
        model complexity. Concept-level reshoots are quoted separately.
      </p>
    ),
    aText:
      "Standard package includes two free revision rounds at review. Additional revisions are billed at $50–150 per round depending on model complexity. Concept-level reshoots are quoted separately.",
  },
  {
    q: "Are 3D and lip-sync video supported?",
    a: (
      <p>
        Yes. 3D meshes are generated automatically during model creation
        (GLB / FBX). Video lip-sync is an add-on at the video stage, supporting
        English, Korean, and Japanese. Both are line-item priced in the quote.
      </p>
    ),
    aText:
      "3D meshes (GLB / FBX) are generated automatically during model creation. Video lip-sync supports English, Korean, and Japanese as an add-on at the video stage. Both are line-item priced in the quote.",
  },
  {
    q: "Are there likeness or copyright issues?",
    a: (
      <p>
        Every model is a fictional, AI-generated character designed to avoid
        likeness conflicts with any real person. We own the model assets;
        clients use them within the license window. See our{" "}
        <Link
          href="/en/legal/ai-disclosure"
          className="underline hover:text-white"
        >
          AI synthetic content disclosure
        </Link>{" "}
        for the full position.
      </p>
    ),
    aText:
      "Every model is a fictional, AI-generated character designed to avoid likeness conflicts with any real person. We own the model assets; clients use them within the license window.",
  },
  {
    q: "Do I have to disclose AI in the ad?",
    a: (
      <p>
        Yes, in every market we operate in. EU AI Act Article 50 (in force
        2026), US FTC Endorsement Guides, UK CAP Code, and Korea KCSC guidance
        all require advertiser-side disclosure. We provide a per-deliverable
        recommended caption, alt text, and a compliance documentation block —
        see the{" "}
        <Link
          href="/en/legal/ai-disclosure"
          className="underline hover:text-white"
        >
          disclosure page
        </Link>
        .
      </p>
    ),
    aText:
      "Yes, in every market we operate in. EU AI Act Article 50, US FTC Endorsement Guides, UK CAP Code, and Korea KCSC guidance all require advertiser-side disclosure. We provide a per-deliverable recommended caption, alt text, and compliance documentation block.",
  },
  {
    q: "Can the same model be used across multiple markets?",
    a: (
      <p>
        Yes — that is one of the structural reasons brands choose synthetic
        talent. The same canonical face renders in different markets with
        regional styling. Pricing depends on the territory bundle (Asia,
        North America, EU, Global).
      </p>
    ),
    aText:
      "Yes. The same canonical face renders in different markets with regional styling. Pricing depends on the territory bundle (Asia, North America, EU, Global).",
  },
  {
    q: "How do you bill internationally?",
    a: (
      <p>
        USD, EUR, SGD, GBP via Stripe Checkout (Stripe Tax applies for EU and
        US clients). Wire transfer is available for engagements over $10,000.
        Invoices are issued in your billing currency.
      </p>
    ),
    aText:
      "USD, EUR, SGD, GBP via Stripe Checkout (Stripe Tax applies for EU and US clients). Wire transfer is available for engagements over $10,000. Invoices are issued in your billing currency.",
  },
  {
    q: "How fast do you respond to inquiries?",
    a: (
      <p>
        Internal SLA: median 4 hours, p90 12 hours for the first reply.
        Inquiries past 24 hours trigger an automatic follow-up and surface on
        our operations dashboard as stale. The response time strip on the
        catalog homepage shows the live 7-day median.
      </p>
    ),
    aText:
      "Internal SLA: median 4 hours, p90 12 hours for the first reply. Inquiries past 24 hours trigger an automatic follow-up.",
  },
];

export default function EnFAQPage() {
  const faqLd = faqPageLd(
    FAQ.map((item) => ({ question: item.q, answer: item.aText }))
  );
  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(faqLd) }}
      />
      <header className="border-b border-zinc-900 px-8 py-5">
        <Link
          href="/en"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
          Frequently asked
        </p>
        <h1 className="text-4xl font-bold mb-3">FAQ</h1>
        <p className="text-zinc-400 mb-10">
          Have something not covered here? Email{" "}
          <a
            href="mailto:hello@aihubs.uk"
            className="text-zinc-200 underline hover:text-white"
          >
            hello@aihubs.uk
          </a>
          .
        </p>

        <ul className="divide-y divide-zinc-900 border-y border-zinc-900">
          {FAQ.map((item, i) => (
            <li key={i}>
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-5">
                  <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-5 text-sm leading-relaxed text-zinc-400">
                  {item.a}
                </div>
              </details>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center flex justify-center gap-2 flex-wrap">
          <Link
            href="/en/rfp"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            Send a brief
          </Link>
          <Link
            href="/en/match"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Match a model
          </Link>
        </div>
      </main>
    </div>
  );
}
