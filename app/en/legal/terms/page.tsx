import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Terms of Service — Virtual Agency",
  description: "Terms of Service for Virtual Agency",
  alternates: {
    canonical: `${SITE_URL}/en/legal/terms`,
    languages: {
      en: `${SITE_URL}/en/legal/terms`,
      ko: `${SITE_URL}/legal/terms`,
    },
  },
};

export default function EnTermsPage() {
  return (
    <>
      <p className="text-xs text-zinc-500 uppercase tracking-widest">
        Last revised 2026-05-26
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-8 text-white">
        Terms of Service
      </h1>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        1. Purpose
      </h2>
      <p className="leading-relaxed">
        These Terms govern access to and use of the AI virtual model agency
        services (the &ldquo;Service&rdquo;) provided by Virtual Agency
        (&ldquo;the Company&rdquo;). They set out the rights and obligations of
        the Company and the customer (&ldquo;Client&rdquo;).
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        2. Scope of Service
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>Browsing and matching against the AI virtual model catalog</li>
        <li>Quote generation and inquiry handling for model licensing</li>
        <li>Production project management for advertising and content</li>
        <li>Delivery and licensing of produced assets</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        3. Licensing and Permitted Use
      </h2>
      <p className="leading-relaxed">
        All images, video, and 3D assets generated for or featuring a Virtual
        Agency model remain the intellectual property of the Company. The
        Client&apos;s use of these assets is bounded by the term, region,
        channel, and industry described in the relevant license. Exclusive
        licenses restrict competitors in the named category from licensing the
        same model during the contract window. Non-exclusive licenses permit
        concurrent licensing by other parties.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        4. Prohibited Uses
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>
          Use of model assets outside the license scope, including deepfake
          impersonation, sexualized content, or political endorsement
        </li>
        <li>Modifying the model&apos;s appearance to imply real-person likeness</li>
        <li>Reselling or transferring the assets to third parties</li>
        <li>Scraping or automated harvesting of the catalog or APIs</li>
        <li>
          Use that violates the disclosure requirements outlined in our{" "}
          <Link
            href="/en/legal/ai-disclosure"
            className="text-zinc-300 underline hover:text-white"
          >
            AI synthetic content disclosure
          </Link>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        5. Pricing and Payment
      </h2>
      <p className="leading-relaxed">
        Daily rates and exclusive bundles are quoted in USD, EUR, SGD, or GBP.
        Multi-day discounts apply automatically. Final pricing is confirmed in
        the written quote. Payment is processed via Stripe Checkout (Stripe Tax
        is applied for EU and US clients) or via wire transfer for engagements
        of $10,000 or more.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        6. Cancellation and Refund
      </h2>
      <p className="leading-relaxed">
        Full refund if cancelled before production begins. Once production has
        started, fees are prorated based on stages completed. Once delivery is
        signed off, the engagement is non-refundable.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        7. Limitation of Liability
      </h2>
      <p className="leading-relaxed">
        AI generation depends on external compute infrastructure. The Company is
        not liable for delays or failures caused by force majeure, third-party
        outages, or factors outside reasonable control. Aggregate liability for
        any engagement is limited to the fees paid for that engagement.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        8. Governing Law and Disputes
      </h2>
      <p className="leading-relaxed">
        These Terms are governed by the laws of the Republic of Korea. Disputes
        shall be resolved in the courts having jurisdiction over the
        Company&apos;s registered office. Clients in the EU retain mandatory
        consumer-protection rights under their local law where applicable.
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        These Terms are a template and should be reviewed by legal counsel
        before being relied on in a binding agreement.
      </p>
    </>
  );
}
