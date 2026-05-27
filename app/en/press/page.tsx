import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Download, Mail, ArrowRight } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Press — Virtual Agency",
  description:
    "Press materials for Virtual Agency — the K-aesthetic AI virtual model studio for global brands. Stats, logos, executive bio, media contact.",
  alternates: {
    canonical: `${SITE_URL}/en/press`,
    languages: {
      en: `${SITE_URL}/en/press`,
      ko: `${SITE_URL}/press`,
    },
  },
  openGraph: {
    title: "Press — Virtual Agency",
    description:
      "Press materials, stats, logos, and media contact for global press.",
    url: `${SITE_URL}/en/press`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_press=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Press — Virtual Agency",
    description: "Press materials and media contact for global press.",
    images: [`${SITE_URL}/api/og?en_press=1`],
  },
};

interface PressStats {
  activeModels: number | null;
  deliveredProjects: number | null;
  reviewedModels: number | null;
}

async function loadStats(): Promise<PressStats> {
  if (!SUPABASE_CONFIGURED) {
    return {
      activeModels: null,
      deliveredProjects: null,
      reviewedModels: null,
    };
  }
  try {
    const supabase = await createClient();
    const [models, delivered, reviews] = await Promise.all([
      supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),
      supabase
        .from("reviews")
        .select("model_id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);
    return {
      activeModels: models.count ?? null,
      deliveredProjects: delivered.count ?? null,
      reviewedModels: reviews.count ?? null,
    };
  } catch {
    return {
      activeModels: null,
      deliveredProjects: null,
      reviewedModels: null,
    };
  }
}

export default async function EnPressPage() {
  const stats = await loadStats();

  const facts = [
    {
      label: "Active models",
      value:
        stats.activeModels != null ? `${stats.activeModels}+` : "Undisclosed",
    },
    {
      label: "Campaigns delivered",
      value:
        stats.deliveredProjects != null
          ? `${stats.deliveredProjects}+`
          : "Undisclosed",
    },
    {
      label: "Verified client reviews",
      value:
        stats.reviewedModels != null
          ? `${stats.reviewedModels}+`
          : "Undisclosed",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Press · Media kit
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Virtual Agency Press Kit
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            The K-aesthetic AI virtual model studio for global brands. All
            content and brand assets on this page are cleared for editorial
            use.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-4 mb-16">
          {facts.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40"
            >
              <p className="text-2xl font-semibold tabular-nums">{f.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{f.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Latest release</h2>
          <Link
            href="/en/press/character-launch"
            className="block rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600 transition-colors"
          >
            <p className="text-xs text-zinc-500 mb-1">May 27, 2026</p>
            <p className="text-sm font-semibold text-zinc-100 leading-snug">
              Virtual Agency Launches Owned K-Aesthetic Synthetic Talent
              Lineup «Yuna» and «Ren» for Global Brands
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              Owned K-aesthetic IP · quarterly paired brand kits · 4-market
              disclosure compliance pipeline.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-400">
              Full release →
            </span>
          </Link>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">One-line</h2>
          <blockquote className="border-l-2 border-zinc-700 pl-4 text-zinc-300 italic">
            &laquo;The production layer for K-aesthetic. Cast in 24 hours,
            deliver in days, license per campaign — at roughly a tenth the
            cost of a traditional shoot.&raquo;
          </blockquote>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Long-form</h2>
          <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
            <p>
              Virtual Agency is a production studio that builds AI-generated
              virtual models for global brands deploying K-aesthetic
              campaigns. It solves three structural constraints that human
              casting cannot — cross-market consistency, fast iteration on
              campaign creative, and per-asset cost economics that scale with
              channels rather than headcount.
            </p>
            <p>
              The platform runs on its own GPU infrastructure and ships an
              end-to-end pipeline: matching engine, RFP intake, briefing,
              generation, review, and campaign delivery. Brands receive
              consistent talent across markets, in the language of K-aesthetic,
              with synthetic-content disclosure built in for EU AI Act,
              FTC, ASA, and KCSC compliance.
            </p>
            <p>
              The company operates as a vertical specialist — K-aesthetic
              first, with adjacent verticals in development. All synthetic
              content is clearly disclosed as AI-generated per market
              regulation. See the <Link href="/en/legal/ai-disclosure" className="underline hover:text-white">compliance disclosure</Link>.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Brand assets</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
              <div className="h-24 flex items-center justify-center rounded bg-white text-black font-bold tracking-widest uppercase mb-4">
                Virtual Agency
              </div>
              <p className="text-sm text-zinc-300 font-medium">
                Primary logo (light)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Use on light backgrounds. Min width 80px.
              </p>
              <a
                href="/press/logo-light.svg"
                download
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 rounded-md px-2.5 py-1.5"
              >
                <Download className="w-3 h-3" /> SVG
              </a>
            </div>
            <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
              <div className="h-24 flex items-center justify-center rounded bg-black border border-zinc-700 text-white font-bold tracking-widest uppercase mb-4">
                Virtual Agency
              </div>
              <p className="text-sm text-zinc-300 font-medium">
                Inverted logo (dark)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Use on dark backgrounds. Min width 80px.
              </p>
              <a
                href="/press/logo-dark.svg"
                download
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 rounded-md px-2.5 py-1.5"
              >
                <Download className="w-3 h-3" /> SVG
              </a>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Do not alter proportions or recolor the mark. Combination logos or
            single-language variants available on request — contact media
            relations.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Campaign visuals</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Catalog imagery is licensed exclusively to active campaign
            clients. For editorial use, request general press visuals via
            media relations below.
          </p>
          <Link
            href="/en"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white"
          >
            Browse the catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">Media relations</h2>
          <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
            <p className="text-sm text-zinc-300">
              For press releases, interviews, and case-study coverage, please
              contact:
            </p>
            <a
              href="mailto:press@aihubs.uk"
              className="mt-4 inline-flex items-center gap-2 text-sm text-white hover:underline"
            >
              <Mail className="w-4 h-4" />
              press@aihubs.uk
            </a>
            <p className="text-xs text-zinc-500 mt-3">
              We respond within 24 business hours, weekdays — typically
              faster.
            </p>
          </div>
        </section>

        <footer className="text-xs text-zinc-600 border-t border-zinc-900 pt-6">
          All stats on this page are aggregated from live production data.
        </footer>
      </main>
    </div>
  );
}
