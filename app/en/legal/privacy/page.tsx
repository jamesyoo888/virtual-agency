import type { Metadata } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Privacy Policy ??Virtual Agency",
  description: "How Virtual Agency collects and uses personal information.",
  alternates: {
    canonical: `${SITE_URL}/en/legal/privacy`,
    languages: {
      en: `${SITE_URL}/en/legal/privacy`,
      ko: `${SITE_URL}/legal/privacy`,
    },
  },
};

export default function EnPrivacyPage() {
  return (
    <>
      <p className="text-xs text-zinc-500 uppercase tracking-widest">
        Last revised 2026-05-26
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-8 text-white">
        Privacy Policy
      </h1>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        1. What we collect
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>
          Account: email, password (hashed), company name, contact name,
          phone (optional)
        </li>
        <li>Inquiries: campaign brief, budget range, intended use</li>
        <li>
          Automatic: IP address, browser information, page-view log
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        2. How we use it
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>Identifying the account holder and providing the Service</li>
        <li>Responding to inquiries and generating quotes</li>
        <li>Contract execution, billing, and settlement</li>
        <li>Anonymized analytics to improve the Service</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        3. Retention
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>Account data: until account closure (deleted within 30 days)</li>
        <li>
          Contract and payment records: 5 years (Korean Commerce Act)
        </li>
        <li>Server logs: 3 months</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        4. Third-party sharing
      </h2>
      <p className="leading-relaxed">
        We do not share personal information with third parties without
        consent, except where required by law or compelled by legitimate
        legal process.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        5. Data processors
      </h2>
      <p className="leading-relaxed">
        We rely on the following processors to operate the Service:
      </p>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>Vercel ??web hosting</li>
        <li>Supabase (self-hosted) ??database and authentication</li>
        <li>Stripe ??payment processing (for EN clients)</li>
        <li>Replicate ??model inference (transient)</li>
        <li>Meshy ??3D mesh generation (transient input)</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        6. Your rights
      </h2>
      <p className="leading-relaxed">
        You may request access to, correction of, deletion of, or restriction
        on processing of your personal data at any time. EU residents have
        additional rights under the GDPR. UK residents have equivalent rights
        under the UK GDPR. California residents have rights under the CCPA.
        Contact{" "}
        <a
          href="mailto:privacy@aihubs.uk"
          className="text-zinc-300 underline hover:text-white"
        >
          privacy@aihubs.uk
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        7. International transfers
      </h2>
      <p className="leading-relaxed">
        We operate from Korea and use processors located in the US, EU, and
        Singapore. Transfers rely on Standard Contractual Clauses where
        applicable. Personal data of EU and UK residents is not retained
        outside the necessary processor relationships described above.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        8. Security
      </h2>
      <ul className="list-disc list-inside leading-relaxed space-y-1">
        <li>Passwords stored with one-way hashing (bcrypt)</li>
        <li>HTTPS in transit, encrypted at rest where the platform supports it</li>
        <li>Admin access scoped via row-level security policies</li>
        <li>Periodic security review and audit logging</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-3">
        9. Contact
      </h2>
      <p className="leading-relaxed">
        Data Protection Officer:{" "}
        <a
          href="mailto:privacy@aihubs.uk"
          className="text-zinc-300 underline hover:text-white"
        >
          privacy@aihubs.uk
        </a>
      </p>

      <p className="text-xs text-zinc-500 mt-12">
        This policy is a template and should be reviewed by legal counsel
        before being relied on in a binding agreement.
      </p>
    </>
  );
}
