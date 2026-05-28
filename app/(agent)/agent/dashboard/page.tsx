import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Briefcase, Link2, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import {
  loadAgentAttribution,
  AGENT_COMMISSION_RATE,
} from "@/lib/analytics/agent-attribution";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Agency dashboard — Virtual Agency",
  robots: { index: false },
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

interface ClientRow {
  id: string;
  agent_company: string | null;
  agent_status: "pending" | "approved" | "rejected" | null;
  role: "client" | "agent" | "admin";
}

export default async function AgentDashboardPage() {
  if (!SUPABASE_CONFIGURED) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <p className="text-sm text-zinc-500">Supabase not configured.</p>
      </main>
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agent/dashboard");

  const { data: row } = await supabase
    .from("clients")
    .select("id, agent_company, agent_status, role")
    .eq("id", user.id)
    .maybeSingle();
  const client = row as ClientRow | null;

  if (!client || client.role !== "agent") {
    redirect("/agent/onboard");
  }
  if (client.agent_status !== "approved") {
    redirect("/agent/onboard");
  }

  // utm_campaign carries the agent's id; pre-built link saves the partner
  // from constructing it. Same pattern as the Wave 25 referral flow.
  const referralLink = `${SITE_URL}/?utm_source=agent&utm_campaign=${client.id}`;
  const [attribution, attribution30] = await Promise.all([
    loadAgentAttribution(client.id, 90),
    loadAgentAttribution(client.id, 30),
  ]);
  const commissionEstimate = Math.round(
    attribution.totalRevenue * AGENT_COMMISSION_RATE
  );
  const commissionEstimate30 = Math.round(
    attribution30.totalRevenue * AGENT_COMMISSION_RATE
  );
  const characterPct =
    attribution.totalInquiries > 0
      ? Math.round(
          (attribution.characterFunnel / attribution.totalInquiries) * 100
        )
      : 0;
  const blogPct =
    attribution.totalInquiries > 0
      ? Math.round((attribution.blogFunnel / attribution.totalInquiries) * 100)
      : 0;
  // Momentum signal: trailing 30d as % of trailing 90d. >=33% means the
  // last 30d is pulling its weight; lower means activity slowed.
  const momentumPct =
    attribution.totalInquiries > 0
      ? Math.round(
          (attribution30.totalInquiries / attribution.totalInquiries) * 100
        )
      : 0;

  return (
    <main className="max-w-3xl mx-auto p-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl font-bold">
            {client.agent_company ?? "Agency"} — partner dashboard
          </h1>
        </div>
        <p className="text-sm text-zinc-400">
          Welcome aboard. Use the referral link below to bring campaigns to
          Virtual Agency — commission is 15% of delivered project revenue.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-200">
            Your referral link
          </p>
        </div>
        <code className="block bg-black/40 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 break-all">
          {referralLink}
        </code>
        <p className="text-[11px] text-zinc-500 mt-2">
          Inquiries arriving via this link are attributed to your account.
          Commission settles monthly on delivered projects.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <p className="text-sm font-medium text-zinc-200">
            Last 90 days · your referrals
          </p>
        </div>
        {attribution.totalInquiries === 0 ? (
          <p className="text-xs text-zinc-500 leading-relaxed">
            No referrals captured yet. Share the link above — once an inquiry
            arrives via your code we&rsquo;ll surface inquiry / delivery / revenue
            and commission estimate here.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Inquiries
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {attribution.totalInquiries}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Delivered
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
                {attribution.totalDelivered}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Revenue (delivered)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
                ₩{attribution.totalRevenue.toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-900/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400">
                Commission est. (15%)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-200">
                ₩{commissionEstimate.toLocaleString("ko-KR")}
              </p>
            </div>
          </div>
        )}
        {attribution.totalInquiries > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
              Trailing 30 days
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs text-zinc-300 mb-4">
              <div>
                <p className="text-zinc-500">Inquiries (30d)</p>
                <p className="mt-1 tabular-nums">
                  {attribution30.totalInquiries}
                  <span className="ml-2 text-zinc-600">
                    {momentumPct}% of 90d
                  </span>
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Delivered (30d)</p>
                <p className="mt-1 tabular-nums text-emerald-300">
                  {attribution30.totalDelivered}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Commission est. (30d)</p>
                <p className="mt-1 tabular-nums text-emerald-200">
                  ₩{commissionEstimate30.toLocaleString("ko-KR")}
                </p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-violet-300" /> Funnel overlap
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300">
              <div>
                <p className="text-zinc-500">Touched a character page</p>
                <p className="mt-1 tabular-nums">
                  {attribution.characterFunnel} of {attribution.totalInquiries}{" "}
                  ·{" "}
                  <span
                    className={
                      characterPct >= 25 ? "text-violet-300" : "text-zinc-500"
                    }
                  >
                    {characterPct}%
                  </span>
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Touched a blog post</p>
                <p className="mt-1 tabular-nums">
                  {attribution.blogFunnel} of {attribution.totalInquiries} ·{" "}
                  <span
                    className={
                      blogPct >= 25 ? "text-emerald-300" : "text-zinc-500"
                    }
                  >
                    {blogPct}%
                  </span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
              Higher percentages mean your prospects browsed our owned-IP or
              blog content before inquiring — useful if you want to lead with
              character / case-study materials in pitch decks.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-200">Sales materials</p>
        </div>
        <ul className="text-sm text-zinc-300 space-y-1.5">
          <li>
            <Link
              href="/en/brief-template"
              className="underline underline-offset-4 hover:text-white"
            >
              Campaign brief template
            </Link>
            <span className="text-zinc-500"> — shareable Markdown</span>
          </li>
          <li>
            <Link
              href="/en/pricing"
              className="underline underline-offset-4 hover:text-white"
            >
              Pricing (USD)
            </Link>
            <span className="text-zinc-500"> — three engagement tiers</span>
          </li>
          <li>
            <Link
              href="/en/cases"
              className="underline underline-offset-4 hover:text-white"
            >
              Case studies
            </Link>
            <span className="text-zinc-500"> — anchor engagements (recruiting)</span>
          </li>
          <li>
            <Link
              href="/en/legal/ai-disclosure"
              className="underline underline-offset-4 hover:text-white"
            >
              Compliance disclosure
            </Link>
            <span className="text-zinc-500"> — EU AI Act / FTC / ASA / KCSC</span>
          </li>
        </ul>
      </section>

      <p className="text-xs text-zinc-500">
        Commission reporting + payment scheduling are rolling out as Wave 106+.
        Until then, contact press@aihubs.uk for manual settlement.
      </p>
    </main>
  );
}
