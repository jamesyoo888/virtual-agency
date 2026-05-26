import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import AgentOnboardForm from "@/components/agent-onboard-form";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Agency signup — Virtual Agency",
  robots: { index: false },
};

interface ClientRow {
  agent_company: string | null;
  agent_status: "pending" | "approved" | "rejected" | null;
  role: "client" | "agent" | "admin";
}

export default async function AgentOnboardPage() {
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
  if (!user) redirect("/login?next=/agent/onboard");

  const { data: existing } = await supabase
    .from("clients")
    .select("agent_company, agent_status, role")
    .eq("id", user.id)
    .maybeSingle();
  const row = existing as ClientRow | null;

  if (row?.role === "agent" && row.agent_status === "approved") {
    redirect("/agent/dashboard");
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-5 h-5 text-zinc-400" />
          <h1 className="text-2xl font-bold">Partner with Virtual Agency</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Agencies and resellers — refer K-aesthetic campaigns to Virtual
          Agency and earn a 15% commission on delivered work. Sign up below;
          our team reviews each application within 2 business days.
        </p>
      </header>

      {row?.role === "agent" && row.agent_status === "pending" && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6">
          <p className="text-sm font-medium text-yellow-300">
            Application under review
          </p>
          <p className="text-xs text-yellow-200/80 mt-1">
            We typically respond within 2 business days. Updating the form
            below resets the review queue.
          </p>
        </div>
      )}
      {row?.role === "agent" && row.agent_status === "rejected" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 mb-6">
          <p className="text-sm font-medium text-red-300">
            Application declined
          </p>
          <p className="text-xs text-red-200/80 mt-1">
            You can resubmit below. A note from your sales contact often
            helps.
          </p>
        </div>
      )}

      <AgentOnboardForm
        initialCompany={row?.agent_company ?? ""}
        canApply={row?.role !== "admin"}
      />
    </main>
  );
}
