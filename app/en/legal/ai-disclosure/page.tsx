import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "AI Synthetic Content Disclosure — Virtual Agency",
  description:
    "Virtual Agency's compliance posture for synthetic AI-generated talent. Covers EU AI Act Article 50, US FTC Endorsement Guides, UK ASA / CAP Code, and Korea's KCSC guidance.",
  alternates: {
    canonical: `${SITE_URL}/en/legal/ai-disclosure`,
    languages: {
      en: `${SITE_URL}/en/legal/ai-disclosure`,
      ko: `${SITE_URL}/legal/ai-disclosure`,
    },
  },
};

export default function EnAiDisclosurePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <header className="border-b border-zinc-900 px-8 py-4">
        <Link
          href="/en"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          ← Virtual Agency
        </Link>
      </header>
      <article className="max-w-3xl mx-auto px-8 py-12 prose prose-invert prose-zinc">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">
          Last revised 2026-05-26 · Version 1.0
        </p>
        <h1 className="text-3xl font-bold mt-2 mb-3 text-white">
          AI Synthetic Content Disclosure
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          Every model on Virtual Agency is a fictional, AI-generated synthetic
          talent. These are not photographs of real people. This page explains
          how we surface that fact and what brands must do when running
          campaigns with our output.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">
          1. Core principles
        </h2>
        <ul className="list-disc list-inside leading-relaxed space-y-1.5">
          <li>
            <strong className="text-white">We never hide the synthetic nature.</strong>{" "}
            Every model profile, OG card, and generated image carries an
            AI-generated marker.
          </li>
          <li>
            <strong className="text-white">No real-person impersonation.</strong>{" "}
            Our characters are fictional and do not depict any real person,
            celebrity, or public figure.
          </li>
          <li>
            <strong className="text-white">We document manipulability.</strong>{" "}
            Every deliverable ships with disclosure metadata so downstream
            platforms can route it correctly.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">
          2. Regulations we follow
        </h2>

        <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
          2.1 EU AI Act Article 50 (in force 2026)
        </h3>
        <p className="leading-relaxed">
          Campaigns targeting the EU must disclose that image, audio, or video
          content was artificially generated or manipulated (Art. 50 §2).
          Virtual Agency provides:
        </p>
        <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
          <li>
            <strong className="text-white">C2PA / metadata watermarks</strong>{" "}
            embedded in EXIF and C2PA manifest (enabled on request)
          </li>
          <li>
            <strong className="text-white">Visible watermarks</strong> — corner
            or caption {`«AI-generated»`} / {`«Synthetic»`} option
          </li>
          <li>
            <strong className="text-white">Alt text</strong> — {`«AI-generated portrait of a fictional model named {name}»`}{" "}
            auto-generated
          </li>
        </ul>

        <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
          2.2 US FTC Endorsement Guides
        </h3>
        <p className="leading-relaxed">
          The US Federal Trade Commission treats virtual influencers and AI
          models under the same standard as human endorsers (16 CFR Part 255,
          revised 2023). Campaign posts must include:
        </p>
        <ul className="list-disc list-inside leading-relaxed space-y-1 mt-2">
          <li>{`«This is a fictional, AI-generated character»`} or similar</li>
          <li>{`#ad / #sponsored`} for paid placements</li>
          <li>
            No claim of personal experience with the product (the model has
            never used it)
          </li>
        </ul>

        <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
          2.3 UK ASA / CAP Code
        </h3>
        <p className="leading-relaxed">
          The UK Advertising Standards Authority prohibits misleading
          representation (CAP Code Rule 3.1). The synthetic nature of the model
          must be communicated clearly enough that the average consumer
          understands it — via caption, subtitle, hashtag, or on-screen text.
        </p>

        <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">
          2.4 Korea KCSC guidance (June 2024)
        </h3>
        <p className="leading-relaxed">
          The Korea Communications Standards Commission and the Korea Fair
          Trade Commission recommend labelling AI virtual model ads as
          {` «가상 인물입니다» `} or {` «AI 모델» `}. For cosmetics, food, and
          finance — categories with efficacy claims — labelling is effectively
          mandatory.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">
          3. What we apply automatically
        </h2>
        <ul className="list-disc list-inside leading-relaxed space-y-1.5">
          <li>
            {`«AI Synthetic»`} badge on the top-right of every model detail page
          </li>
          <li>{`«AI-generated synthetic talent»`} line in OG cards</li>
          <li>
            Link to this disclosure ({" "}
            <Link
              href="/en/legal/ai-disclosure"
              className="text-zinc-300 underline hover:text-white"
            >
              /en/legal/ai-disclosure
            </Link>{" "}
            ) on every model page
          </li>
          <li>
            {`«Synthetic talent — campaign disclosure required»`} footer line on
            every quote PDF
          </li>
          <li>
            JSON-LD <code className="text-zinc-300">additionalType</code>{" "}
            marking on Person schema
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">
          4. What advertisers must do
        </h2>
        <ol className="list-decimal list-inside leading-relaxed space-y-1.5">
          <li>
            Surface the synthetic nature in your creative — at least one of
            caption, subtitle, or on-screen text should say {`«AI model»`},
            {` «Virtual model» `}, or {` «AI-generated» `}.
          </li>
          <li>
            Enable the watermark option appropriate for your target market (EU
            = C2PA required).
          </li>
          <li>
            Do not write copy that implies first-person product experience
            (e.g., {`«I've been using this for…»`}).
          </li>
          <li>
            Do not modify the output to resemble a real person or
            celebrity — implicitly or explicitly.
          </li>
        </ol>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">
          5. Prohibited uses
        </h2>
        <ul className="list-disc list-inside leading-relaxed space-y-1">
          <li>
            Digital-twin generation of real people (face, voice, body)
          </li>
          <li>Political or election content without explicit synthetic disclosure</li>
          <li>Posing as a medical or financial professional</li>
          <li>Sexualized or harmful content involving figures who could read as under 18</li>
          <li>Hate or discriminatory depictions of any race, gender, or religion</li>
        </ul>
        <p className="leading-relaxed mt-2">
          Confirmed violations trigger an immediate takedown request from us;
          repeat violations terminate the engagement.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">
          6. Compliance contact
        </h2>
        <p className="leading-relaxed">
          For market-specific labelling questions or legal review:{" "}
          <a
            href="mailto:compliance@virtualagency.example.com"
            className="text-zinc-300 underline hover:text-white"
          >
            compliance@virtualagency.example.com
          </a>
        </p>

        <p className="text-xs text-zinc-500 mt-12">
          This policy is our operating standard, synthesized from the EU AI Act,
          US FTC Endorsement Guides, UK ASA CAP Code, and Korea KCSC guidance.
          It is not a substitute for campaign-specific legal advice. Advertisers
          remain responsible for confirming the latest rules in their target
          markets.
        </p>
      </article>
    </div>
  );
}
