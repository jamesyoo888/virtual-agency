import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, ListChecks } from "lucide-react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Campaign Brief Template — Virtual Agency",
  description:
    "Free K-aesthetic AI virtual model campaign brief template. Fill it in, paste into the RFP page, get matched models and a quote in 24 hours.",
  alternates: {
    canonical: `${SITE_URL}/en/brief-template`,
    languages: {
      en: `${SITE_URL}/en/brief-template`,
      ko: `${SITE_URL}/brief-template`,
    },
  },
  openGraph: {
    title: "Campaign Brief Template — Virtual Agency",
    description:
      "Free K-aesthetic AI virtual model campaign brief — 9 sections, plain Markdown.",
    type: "article",
    locale: "en_US",
  },
};

const BRIEF_MD = `# Campaign Brief — [Brand / Product]

> Virtual Agency Brief Template v1 (English)
> Date: ____ / Author: ____

## 1. Campaign one-liner (1-2 lines)
What product / service, what tone, what channels?

Example) [Brand]'s [new product line] in a cool, urban K-aesthetic tone for
Instagram feed + 3 outdoor key visuals across US and EU markets.

## 2. Schedule
- Generation start (target): ____
- First-proof review by: ____
- Final delivery deadline: ____
- Campaign launch (live date): ____

## 3. Target audience
- Primary: (e.g. women 25-34, urban, mid-to-high beauty engagement)
- Secondary: (optional)
- Core value / message:

## 4. Model persona — mood and register
- Industry / category tone: (Beauty / Tech / F&B / Luxury / Lifestyle / ...)
- Mood: (Cool / Warm / Neutral / Edgy)
- Genre: (Ad / Film / Drama / Noir / Romance / Sci-fi / Historical / Indie / Horror)
- Reference model: (Virtual Agency catalog model ID, or external moodboard URLs)

## 5. Deliverables — exact formats
| Channel | Size / format | Count | Use |
|---|---|---|---|
| Instagram feed 1:1 | 1080×1080 jpg | 6 | Paid social |
| OOH key visual | 4000×6000 png | 3 | NYC SoHo digital signage |
| Video | 1080p mp4 5s | 2 | Retargeting ads |

## 6. Licensing
- Channels: (Owned / Paid / Earned — how far does the license need to reach?)
- Duration: (3 months / 6 months / 1 year)
- Exclusivity: (do you need competitor exclusivity in your category?)
- Territory: (US / EU / SEA / global)

## 7. Budget (optional — improves matching accuracy)
- Model licensing budget: $____
- Production budget (if including video): $____
- Total budget: $____

## 8. References
- Liked tone / images (3 URLs)
- Hard nos (moods · colors · expressions to avoid)

## 9. Other
- Brand / agency contact:
- Constraints (no certain colors, religious messaging, mandatory disclosure
  text, etc.):
- Payment terms (deposit % / balance trigger):
- Notes:

---
[Virtual Agency](${SITE_URL}/en) — fill this in and we'll come back within 24
business hours with matched models and a quote.
`;

const CHECKLIST = [
  {
    title: "Campaign one-liner",
    note: "Brand · product · channels — in one sentence",
  },
  {
    title: "Exact deliverable formats",
    note: "Sizes, counts, and channels per asset",
  },
  {
    title: "License duration & territory",
    note: "The two biggest quote variables",
  },
  {
    title: "Reference model or mood",
    note: "Catalog model ID is fastest; URLs work too",
  },
  {
    title: "Budget range",
    note: "Doesn't need to be exact — matching gets sharper with a range",
  },
  {
    title: "Generation → delivery schedule",
    note: "Minimum 7 business days recommended",
  },
];

export default function EnBriefTemplatePage() {
  // Inline data URL — keeps the page self-contained, no extra static file.
  const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(
    BRIEF_MD
  )}`;
  return (
    <div className="px-6 py-16 max-w-3xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-zinc-500">
        Resources
      </p>
      <h1 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
        Campaign brief template
      </h1>
      <p className="mt-4 text-zinc-400 leading-relaxed">
        For brands new to commissioning AI virtual model campaigns. Nine
        sections covering the questions we ask first when quoting. Paste it
        into the{" "}
        <Link href="/en/rfp" className="underline underline-offset-4">
          RFP page
        </Link>{" "}
        or send it to{" "}
        <a
          className="underline underline-offset-4"
          href="mailto:hello@aihubs.uk"
        >
          hello@aihubs.uk
        </a>{" "}
        — we respond within 24 business hours with matched models and a
        quote.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={dataUrl}
          download="virtual-agency-brief-template.md"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-zinc-200"
        >
          <Download className="w-4 h-4" /> Download Markdown
        </a>
        <Link
          href="/en/rfp"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500"
        >
          <FileText className="w-4 h-4" /> Submit an RFP
        </Link>
        <Link
          href="/en/match"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500"
        >
          Match a model
        </Link>
      </div>

      <section className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Minimum checklist
          </h2>
        </div>
        <ul className="space-y-3">
          {CHECKLIST.map((c) => (
            <li
              key={c.title}
              className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/30"
            >
              <p className="text-sm font-medium text-zinc-100">{c.title}</p>
              <p className="text-xs text-zinc-500 mt-1">{c.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-xl border border-zinc-800 p-6 bg-zinc-900/40">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-3">
          Preview (Markdown)
        </h2>
        <pre className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
          {BRIEF_MD}
        </pre>
      </section>
    </div>
  );
}
