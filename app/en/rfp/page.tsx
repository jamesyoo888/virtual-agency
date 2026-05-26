import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { rankModels, type MatchBrief } from "@/lib/matching/score";
import { loadPersonaSignals } from "@/lib/matching/persona";
import {
  INDUSTRY_OPTIONS_EN,
  MOOD_OPTIONS_EN,
} from "@/lib/tags";
import ModelCard from "@/components/model-card";
import RfpFilterChips from "@/components/rfp-filter-chips";
import { persistRfpSubmission } from "@/lib/rfp/persist";
import { ArrowLeft, FileText } from "lucide-react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Request for Proposal — Virtual Agency",
  description:
    "One-page campaign RFP for global brands. Fill in the brief; we return matched K-aesthetic AI models with day rates and licensing terms.",
  alternates: {
    canonical: `${SITE_URL}/en/rfp`,
    languages: {
      en: `${SITE_URL}/en/rfp`,
      ko: `${SITE_URL}/rfp`,
    },
  },
  // Print-friendly briefing pages don't need indexing.
  robots: { index: false, follow: false },
};

const CHANNEL_OPTIONS = [
  { value: "tvc", label: "TV commercial" },
  { value: "digital", label: "Digital / social" },
  { value: "ooh", label: "Out-of-home" },
  { value: "print", label: "Print" },
  { value: "lookbook", label: "Lookbook" },
  { value: "kv", label: "Key visual" },
];

const BUDGET_OPTIONS = [
  { value: "under_5k", label: "Under $5,000" },
  { value: "5k_15k", label: "$5,000 – $15,000" },
  { value: "15k_50k", label: "$15,000 – $50,000" },
  { value: "over_50k", label: "Over $50,000" },
];

interface PageProps {
  searchParams: Promise<{
    campaign?: string;
    advertiser?: string;
    launch?: string;
    duration_days?: string;
    channels?: string;
    message?: string;
    hero_copy?: string;
    industries?: string;
    moods?: string;
    target_age?: string;
    budget_band?: string;
    budget_per_day?: string;
    exclusive?: string;
  }>;
}

function parseCsv<T extends string>(
  raw: string | undefined,
  allowed: readonly T[]
): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
}

async function fetchActiveModels(): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter(
      (m) => m.status === "active"
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select("*")
    .eq("status", "active");
  return (data as Model[]) ?? [];
}

export default async function EnRfpPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const campaign = sp.campaign ?? "";
  const advertiser = sp.advertiser ?? "";
  const launch = sp.launch ?? "";
  const duration = sp.duration_days ?? "";
  const channels = parseCsv(
    sp.channels,
    CHANNEL_OPTIONS.map((c) => c.value)
  );
  const message = sp.message ?? "";
  const heroCopy = sp.hero_copy ?? "";
  const industries = parseCsv(
    sp.industries,
    INDUSTRY_OPTIONS_EN.map((o) => o.value)
  );
  const moods = parseCsv(sp.moods, MOOD_OPTIONS_EN.map((o) => o.value));
  const targetAge = sp.target_age ?? "";
  const budgetBand = sp.budget_band ?? "";
  const budgetPerDay = sp.budget_per_day
    ? Number.parseInt(sp.budget_per_day, 10)
    : null;
  const needsExclusive = sp.exclusive === "true";

  const hasInput =
    campaign.length > 0 ||
    industries.length > 0 ||
    moods.length > 0 ||
    !!budgetPerDay;

  // USD day rate → approximate KRW for scorer (catalog stores KRW). Rough
  // conversion at 1300 KRW/USD is good enough for ranking.
  const budgetKrwApprox = budgetPerDay ? Math.round(budgetPerDay * 1300) : null;

  let recommended: { model: Model; score: number; reasons: string[] }[] = [];
  if (hasInput) {
    const [models, persona] = await Promise.all([
      fetchActiveModels(),
      loadPersonaSignals(),
    ]);
    const brief: MatchBrief = {
      industries,
      genres: [],
      moods,
      budgetPerDay: budgetKrwApprox,
      needsExclusive,
      freeText: `${campaign} ${message} ${heroCopy}`,
      personaInquiries: persona.inquiries,
      personaRfps: persona.rfps,
    };
    recommended = rankModels(models, brief).slice(0, 5);
    // Persist for authed users — feeds persona weighting and admin RFP funnel.
    // Fire-and-forget. Tag with locale via campaign prefix for visibility in admin.
    void persistRfpSubmission(
      {
        campaign: campaign ? `[EN] ${campaign}` : "[EN]",
        advertiser,
        launch,
        durationDays: duration,
        channels,
        message,
        heroCopy,
        industries,
        moods,
        targetAge,
        budgetBand,
        budgetPerDay: budgetKrwApprox,
        needsExclusive,
      },
      recommended.map((r) => ({
        id: r.model.id,
        name: r.model.name,
        score: Math.round(r.score),
      }))
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between print:hidden">
        <Link
          href="/en"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
        <Link
          href="/en"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Home
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 print:py-4 print:max-w-none">
        <div className="flex items-start justify-between gap-4 mb-8 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-zinc-400" />
              <h1 className="text-2xl font-bold">Request for Proposal</h1>
            </div>
            <p className="text-sm text-zinc-500">
              Fill in the campaign brief. We return matched models with day
              rates and licensing terms — print or save as PDF.
            </p>
          </div>
        </div>

        <div className="hidden print:block mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-1">
            Virtual Agency · Request for Proposal
          </p>
          <h1 className="text-2xl font-bold text-black">
            {campaign || "Campaign — not specified"}
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            {advertiser ? `${advertiser} · ` : ""}
            {launch ? `Launch ${launch}` : ""}
            {duration ? ` · ${duration}-day run` : ""}
          </p>
        </div>

        <form
          method="GET"
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5 mb-8 print:hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Campaign name"
              name="campaign"
              defaultValue={campaign}
              placeholder="2026 FW beauty campaign"
            />
            <Field
              label="Brand / agency"
              name="advertiser"
              defaultValue={advertiser}
              placeholder="ACME / WPP"
            />
            <Field
              label="Launch date"
              name="launch"
              type="date"
              defaultValue={launch}
            />
            <Field
              label="Run duration (days)"
              name="duration_days"
              type="number"
              defaultValue={duration}
              placeholder="14"
            />
          </div>

          <ChipsField
            name="channels"
            label="Channels"
            selected={channels}
            options={CHANNEL_OPTIONS}
          />

          <Textarea
            name="message"
            label="Key message"
            defaultValue={message}
            rows={2}
            placeholder="One-sentence message the brand wants to land"
          />
          <Textarea
            name="hero_copy"
            label="Hero copy (headline)"
            defaultValue={heroCopy}
            rows={2}
            placeholder="Headline that runs alongside the visual"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChipsField
              name="industries"
              label="Industry"
              selected={industries}
              options={INDUSTRY_OPTIONS_EN}
            />
            <ChipsField
              name="moods"
              label="Mood"
              selected={moods}
              options={MOOD_OPTIONS_EN}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Target demographic"
              name="target_age"
              defaultValue={targetAge}
              placeholder="Women 20–34"
            />
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400">
                Total budget band
              </label>
              <select
                name="budget_band"
                defaultValue={budgetBand}
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm"
              >
                <option value="">Select</option>
                {BUDGET_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Day rate cap ($)"
              name="budget_per_day"
              type="number"
              defaultValue={budgetPerDay ?? ""}
              placeholder="600"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="exclusive"
              value="true"
              defaultChecked={needsExclusive}
              className="accent-white"
            />
            Only show models open to category exclusivity
          </label>

          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-white text-black font-medium hover:bg-zinc-200 text-sm"
          >
            Generate RFP + matched models
          </button>
        </form>

        {hasInput && (
          <>
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8 print:border-zinc-300 print:bg-white print:text-black">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4 print:text-zinc-700">
                RFP summary
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <SummaryRow label="Campaign" value={campaign} />
                <SummaryRow label="Brand" value={advertiser} />
                <SummaryRow label="Launch" value={launch} />
                <SummaryRow
                  label="Run duration"
                  value={duration ? `${duration} days` : ""}
                />
                <SummaryRow
                  label="Channels"
                  value={channels
                    .map(
                      (c) =>
                        CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c
                    )
                    .join(", ")}
                />
                <SummaryRow label="Target" value={targetAge} />
                <SummaryRow
                  label="Total budget"
                  value={
                    BUDGET_OPTIONS.find((b) => b.value === budgetBand)?.label ??
                    ""
                  }
                />
                <SummaryRow
                  label="Day rate cap"
                  value={
                    budgetPerDay ? `$${budgetPerDay.toLocaleString()}` : ""
                  }
                />
                <SummaryRow
                  label="Industry"
                  value={industries
                    .map(
                      (v) =>
                        INDUSTRY_OPTIONS_EN.find((o) => o.value === v)?.label ??
                        v
                    )
                    .join(", ")}
                />
                <SummaryRow
                  label="Mood"
                  value={moods
                    .map(
                      (v) =>
                        MOOD_OPTIONS_EN.find((o) => o.value === v)?.label ?? v
                    )
                    .join(", ")}
                />
                <SummaryRow
                  label="Licensing"
                  value={
                    needsExclusive
                      ? "Exclusive requested"
                      : "Non-exclusive OK"
                  }
                />
              </dl>

              {(message || heroCopy) && (
                <div className="mt-5 pt-5 border-t border-zinc-800 print:border-zinc-300 space-y-3">
                  {message && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                        Key message
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{message}</p>
                    </div>
                  )}
                  {heroCopy && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                        Hero copy
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{heroCopy}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4 print:text-zinc-700">
                Matched models (top {recommended.length})
              </h2>
              {recommended.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">
                  No models matched. Try widening industry, mood, or budget.
                </div>
              ) : (
                <div className="space-y-2 print:space-y-1">
                  {recommended.map((r, idx) => (
                    <article
                      key={r.model.id}
                      className="flex items-stretch gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 print:border-zinc-300 print:bg-white print:text-black print:break-inside-avoid"
                    >
                      <div className="w-16 shrink-0 print:w-14">
                        <ModelCard model={r.model} variant="showcase" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="text-xs text-zinc-500 tabular-nums print:text-zinc-600">
                              #{idx + 1}
                            </span>
                            <Link
                              href={`/models/${r.model.id}`}
                              className="font-semibold truncate hover:text-zinc-300 print:hover:text-black"
                            >
                              {r.model.name}
                            </Link>
                          </div>
                          <div className="flex items-baseline gap-1 shrink-0">
                            <span className="text-[10px] text-zinc-500">
                              match
                            </span>
                            <span className="text-lg font-bold tabular-nums">
                              {Math.round(r.score)}
                            </span>
                          </div>
                        </div>
                        {r.reasons.length > 0 && (
                          <p className="text-xs text-zinc-400 line-clamp-2 print:text-zinc-700">
                            {r.reasons.join(" · ")}
                          </p>
                        )}
                        {(r.model.base_price || r.model.exclusive_price) && (
                          <p className="text-xs text-zinc-500 print:text-zinc-700">
                            {r.model.base_price && (
                              <>
                                Day rate ₩
                                {r.model.base_price.toLocaleString()}
                              </>
                            )}
                            {r.model.exclusive_price && (
                              <>
                                {" "}
                                · Exclusive ₩
                                {r.model.exclusive_price.toLocaleString()}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs text-zinc-500 print:text-zinc-600">
              This RFP was generated by virtual-agency-murex.vercel.app — see
              each model page for licensing and contract terms.
            </p>
          </>
        )}
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          html, body { background: white !important; color: black !important; }
        }
      `}</style>

      <RfpFilterChips />
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
      />
    </div>
  );
}

function ChipsField<T extends string>({
  name,
  label,
  selected,
  options,
}: {
  name: string;
  label: string;
  selected: T[];
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input
        type="hidden"
        name={name}
        defaultValue={selected.join(",")}
        data-rfp-chips-target
      />
      <div className="flex flex-wrap gap-1.5" data-rfp-chips={name}>
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              data-rfp-chip-name={name}
              data-rfp-chip-value={o.value}
              data-rfp-chip-active={active}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
      <dt className="text-xs uppercase tracking-wider text-zinc-500 print:text-zinc-600">
        {label}
      </dt>
      <dd className="text-sm text-zinc-200 print:text-black">
        {value || "—"}
      </dd>
    </div>
  );
}
