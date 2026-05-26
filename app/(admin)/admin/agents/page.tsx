import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import AgentDecisionButtons from "@/components/agent-decision-buttons";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agents — Virtual Agency" };

interface AgentRow {
  id: string;
  email: string | null;
  agent_company: string | null;
  agent_status: "pending" | "approved" | "rejected" | null;
  agent_applied_at: string | null;
  company: string | null;
}

const STATUS_CLS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
};

async function loadAgents(filter: string | undefined): Promise<AgentRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select(
      "id, email, agent_company, agent_status, agent_applied_at, company"
    )
    .eq("role", "agent")
    .order("agent_applied_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (filter && ["pending", "approved", "rejected"].includes(filter)) {
    query = query.eq("agent_status", filter);
  }
  const { data } = await query;
  return (data as AgentRow[]) ?? [];
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminAgentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = sp.status;
  const agents = await loadAgents(filter);

  const counts = {
    pending: agents.filter((a) => a.agent_status === "pending").length,
    approved: agents.filter((a) => a.agent_status === "approved").length,
    rejected: agents.filter((a) => a.agent_status === "rejected").length,
  };

  return (
    <main className="px-8 py-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-5 h-5 text-zinc-400" />
          <h1 className="text-2xl font-bold">Agency partners</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Agencies that signed up via /agent/signup. Pending applications wait
          for an admin decision before /agent/dashboard unlocks tools.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6 text-xs">
        {(["pending", "approved", "rejected", undefined] as const).map((f) => {
          const active = (filter ?? undefined) === f;
          const label =
            f === undefined
              ? `All (${agents.length})`
              : `${f[0].toUpperCase()}${f.slice(1)} (${counts[f]})`;
          return (
            <Link
              key={String(f)}
              href={f ? `/admin/agents?status=${f}` : "/admin/agents"}
              className={`px-3 py-1 rounded-full border ${
                active
                  ? "border-white text-white bg-white/10"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          No agency applications match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {agents.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-zinc-100">
                    {a.agent_company ?? a.company ?? "(no name)"}
                  </p>
                  <p className="text-xs text-zinc-500">{a.email ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.agent_status && (
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        STATUS_CLS[a.agent_status]
                      }`}
                    >
                      {a.agent_status}
                    </span>
                  )}
                  <p className="text-[10px] text-zinc-600 tabular-nums">
                    {a.agent_applied_at
                      ? new Date(a.agent_applied_at).toLocaleString("en-US")
                      : ""}
                  </p>
                </div>
              </div>

              {a.agent_status === "pending" && (
                <div className="mt-3">
                  <AgentDecisionButtons agentId={a.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
