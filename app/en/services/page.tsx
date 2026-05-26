import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Image as ImageIcon,
  Video,
  Layers,
  Calendar,
  Palette,
} from "lucide-react";
import { serviceLd, itemListLd, ldScript } from "@/lib/seo/json-ld";

export const revalidate = 86400;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Services ??Virtual Agency",
  description:
    "Five core services for global brands using synthetic K-aesthetic talent: image campaigns, video, lookbooks, fitting day, and brand model kits.",
  alternates: {
    canonical: `${SITE_URL}/en/services`,
    languages: {
      en: `${SITE_URL}/en/services`,
      ko: `${SITE_URL}/services`,
    },
  },
  openGraph: {
    title: "Services ??Virtual Agency",
    description:
      "Image campaigns, video, lookbooks, fitting day, brand model kits.",
    url: `${SITE_URL}/en/services`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_services=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Services ??Virtual Agency",
    description: "Five services, one studio.",
    images: [`${SITE_URL}/api/og?en_services=1`],
  },
};

interface Service {
  key: string;
  Icon: typeof ImageIcon;
  title: string;
  tagline: string;
  deliverable: string;
  turnaround: string;
  priceBand: string;
  bullets: string[];
  cta: { label: string; href: string };
}

const SERVICES: Service[] = [
  {
    key: "image",
    Icon: ImageIcon,
    title: "Image campaign",
    tagline: "5??0 stills on a single concept for social, print, and OOH.",
    deliverable: "High-res JPG/PNG + channel-cropped variants",
    turnaround: "24??2 hours",
    priceBand: "$1,500??5,500",
    bullets: [
      "Same model, same concept, full continuity",
      "Auto-cropped for square, vertical, and landscape social",
      "Unlimited micro revisions after first-proof approval",
      "AI watermark option (EU AI Act / FTC compliant)",
    ],
    cta: { label: "Quote an image campaign", href: "mailto:hello@aihubs.uk?subject=Image%20campaign%20brief" },
  },
  {
    key: "video",
    Icon: Video,
    title: "Video content",
    tagline: "5??0s ad video with optional lip-sync, EN / KR / JA.",
    deliverable: "MP4 1080p or 4K + subtitle option",
    turnaround: "3?? days",
    priceBand: "$3,000??15,000",
    bullets: [
      "Same model concept carried into motion",
      "Lip-sync in English, Korean, Japanese",
      "Simultaneous 16:9 / 9:16 / 1:1 export",
      "BGM, captions, logo integration",
    ],
    cta: { label: "Quote video", href: "mailto:hello@aihubs.uk?subject=Video%20brief" },
  },
  {
    key: "lookbook",
    Icon: Layers,
    title: "Lookbook / series",
    tagline: "Same model, 4??2 stills, ideal for fashion and beauty.",
    deliverable: "Styling guide + series stills + first-draft campaign copy",
    turnaround: "5??0 days",
    priceBand: "$4,500??12,000",
    bullets: [
      "Locked mood (cool / warm / editorial mono)",
      "Styling variation across the same canonical face",
      "Campaign copy first draft included",
      "Auto-generates a /models/[id]/lookbook page",
    ],
    cta: { label: "Quote a lookbook", href: "mailto:hello@aihubs.uk?subject=Lookbook%20brief" },
  },
  {
    key: "fitting",
    Icon: Calendar,
    title: "Fitting day",
    tagline: "Working session with your team to pick the model and lock the concept.",
    deliverable: "5??0 recommended models + concept mood-board + campaign roadmap",
    turnaround: "1?? days (workshop day itself)",
    priceBand: "$1,200??3,500",
    bullets: [
      "Our team visits your office or runs it over video",
      "Curated shortlist filtered to your brand fit",
      "Optional live generation of 1?? proofs in-session",
      "Fee credited if the engagement signs after the workshop",
    ],
    cta: { label: "Request a fitting day", href: "mailto:hello@aihubs.uk?subject=Fitting%20day" },
  },
  {
    key: "brand-kit",
    Icon: Palette,
    title: "Brand model kit",
    tagline: "Quarterly-reuse dedicated talent + concept library.",
    deliverable: "1?? exclusive models + 50 new stills/quarter + a video series",
    turnaround: "14-day initial setup, quarterly refresh",
    priceBand: "$25,000??80,000 / quarter",
    bullets: [
      "Same talent carries across seasonal campaigns",
      "Category-exclusive licensing in your vertical",
      "Quarterly concept refresh + new lookbook",
      "Campaign roadmap consult once per quarter",
    ],
    cta: { label: "Discuss a brand kit", href: "mailto:hello@aihubs.uk?subject=Brand%20kit%20discussion" },
  },
];

export default function EnServicesPage() {
  const serviceNodes = SERVICES.map((s) =>
    serviceLd({
      name: s.title,
      description: s.tagline,
      url: `${SITE_URL}/en/services#${s.key}`,
      priceRange: s.priceBand,
      deliveryTime: s.turnaround,
    })
  );
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      itemListLd(
        "Virtual Agency services",
        SERVICES.map((s) => ({
          name: s.title,
          url: `${SITE_URL}/en/services#${s.key}`,
        }))
      ),
      ...serviceNodes,
    ],
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-14">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Services
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Five services, <br />
            <span className="text-zinc-400">one studio.</span>
          </h1>
          <p className="mt-5 text-zinc-400 max-w-2xl leading-relaxed">
            Image, video, lookbook, fitting day, and brand kit. Each runs on
            the same continuity layer so the model who appears in one
            deliverable carries cleanly into the next ??across quarters and
            across markets.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SERVICES.map((s) => (
            <article
              key={s.key}
              id={s.key}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-7 flex flex-col scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-lg border border-zinc-800 grid place-items-center text-zinc-300">
                  <s.Icon className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-semibold">{s.title}</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-5">{s.tagline}</p>
              <dl className="grid grid-cols-3 gap-3 text-xs mb-5">
                <div>
                  <dt className="text-zinc-600 mb-1">Turnaround</dt>
                  <dd className="text-zinc-200">{s.turnaround}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 mb-1">Price</dt>
                  <dd className="text-zinc-200">{s.priceBand}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600 mb-1">Delivered</dt>
                  <dd className="text-zinc-200 leading-snug">{s.deliverable}</dd>
                </div>
              </dl>
              <ul className="space-y-1.5 text-sm text-zinc-300 mb-6 flex-1">
                {s.bullets.map((b) => (
                  <li key={b} className="leading-relaxed">
                    <span className="text-zinc-600 mr-2">쨌</span>
                    {b}
                  </li>
                ))}
              </ul>
              <a
                href={s.cta.href}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-200 hover:text-white"
              >
                {s.cta.label} <ArrowRight className="w-4 h-4" />
              </a>
            </article>
          ))}
        </section>

        <footer className="mt-16 pt-8 border-t border-zinc-900 text-center">
          <p className="text-sm text-zinc-300 mb-4">
            Unsure which service fits? Send the brief and we will scope it.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <a
              href="mailto:hello@aihubs.uk?subject=Campaign%20brief"
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-4 py-2 hover:bg-zinc-200"
            >
              Send a brief <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/en/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              See pricing
            </Link>
            <Link
              href="/en/cases"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              Case studies
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
