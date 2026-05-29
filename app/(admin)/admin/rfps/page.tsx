import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { INDUSTRY_LABELS, MOOD_LABELS } from "@/lib/tags";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "RFPs — Virtual Agency" };

interface RfpRow {
  id: string;
  client_id: string;
  inputs: {
    campaign?: string;
    advertiser?: string;
    industries?: string[];
    moods?: string[];
    budgetPerDay?: number | null;
    needsExclusive?: boolean;
    launch?: string;
  };
  recommended: { id: string; name: string; score: number }[];
  created_at: string;
  client?: { company: string | null; email: string | null } | null;
}

async function loadRfps(): Promise<RfpRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("rfp_submissions")
    .select(
      "id, client_id, inputs, recommended, created_at, client:clients(company, email)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as unknown as RfpRow[]) ?? [];
}

export default async function AdminRfpsPage() {
  const rows = await loadRfps();

  // Roll up tag demand — what industries and moods are advertisers asking
  // for, across the last 100 RFPs. This is the "leading indicator" view.
  const industryCounts = new Map<string, number>();
  const moodCounts = new Map<string, number>();
  for (const r of rows) {
    for (const i of r.inputs.industries ?? []) {
      industryCounts.set(i, (industryCounts.get(i) ?? 0) + 1);
    }
    for (const m of r.inputs.moods ?? []) {
      moodCounts.set(m, (moodCounts.get(m) ?? 0) + 1);
    }
  }
  const industryTop = [...industryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const moodTop = [...moodCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-bold">RFP 이력</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              최근 100건. 광고주가 무엇을 찾는지 — 문의 이전 단계의 수요 신호.
            </p>
          </div>
        </div>
        <a
          href="/api/admin/exports/rfps"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      {(industryTop.length > 0 || moodTop.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {industryTop.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                수요가 많은 산업
              </h2>
              <ul className="space-y-1.5">
                {industryTop.map(([key, count]) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span>{INDUSTRY_LABELS[key] ?? key}</span>
                    <span className="text-zinc-500 tabular-nums">{count}회</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {moodTop.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                자주 요청되는 분위기
              </h2>
              <ul className="space-y-1.5">
                {moodTop.map(([key, count]) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span>{MOOD_LABELS[key] ?? key}</span>
                    <span className="text-zinc-500 tabular-nums">{count}회</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <header className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            제출된 RFP
          </h2>
          <p className="text-xs text-zinc-600">{rows.length}건</p>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">아직 제출된 RFP가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {rows.map((r) => {
              const top = r.recommended[0];
              return (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.inputs.campaign || "이름 없는 캠페인"}
                        {r.inputs.advertiser && (
                          <span className="text-zinc-500 font-normal"> · {r.inputs.advertiser}</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {r.client?.company || r.client?.email || r.client_id.slice(0, 8)}
                        {" · "}
                        {new Date(r.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    {top && (
                      <Link
                        href={`/admin/models/${top.id}`}
                        className="text-xs text-zinc-400 hover:text-white truncate shrink-0"
                      >
                        Top: {top.name} ({top.score})
                      </Link>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(r.inputs.industries ?? []).map((i) => (
                      <span key={`i-${i}`} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {INDUSTRY_LABELS[i] ?? i}
                      </span>
                    ))}
                    {(r.inputs.moods ?? []).map((m) => (
                      <span key={`m-${m}`} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
                        {MOOD_LABELS[m] ?? m}
                      </span>
                    ))}
                    {r.inputs.budgetPerDay ? (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        일 ₩{r.inputs.budgetPerDay.toLocaleString()}
                      </span>
                    ) : null}
                    {r.inputs.needsExclusive ? (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                        독점
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
