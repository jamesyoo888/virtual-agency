import {
  summarizeUsage,
  recentUsage,
  breakdownUsage,
  dailyHistory,
  spendByUser,
  WINDOW_MS,
} from "@/lib/cost/store";
import { getCapConfig } from "@/lib/cost/cap";
import CapsEditor from "@/components/caps-editor";
import BannerEditor from "@/components/banner-editor";
import Sparkline from "@/components/sparkline";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { getBanner } from "@/lib/banner";

export const dynamic = "force-dynamic";

function fmt(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function pct(current: number, limit: number | null): number {
  if (!limit) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; cost: number; count: number }[];
}) {
  const total = rows.reduce((s, r) => s + r.cost, 0);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">데이터 없음</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const share = total > 0 ? (r.cost / total) * 100 : 0;
            return (
              <li key={r.name} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-zinc-300 font-mono text-xs truncate mr-2">
                    {r.name}
                  </span>
                  <span className="text-zinc-400 tabular-nums shrink-0">
                    {fmt(r.cost)}{" "}
                    <span className="text-zinc-600 text-xs">({r.count})</span>
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 transition-all"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CapCard({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number | null;
}) {
  const percent = pct(current, limit);
  const tone =
    percent >= 90 ? "bg-red-500" : percent >= 60 ? "bg-yellow-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums">{fmt(current)}</p>
        {limit !== null && (
          <p className="text-sm text-zinc-500 tabular-nums">/ {fmt(limit)}</p>
        )}
      </div>
      {limit !== null ? (
        <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full ${tone} transition-all`}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-zinc-600">cap 미설정 — 무제한</p>
      )}
    </div>
  );
}

async function emailsForUserIds(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!SUPABASE_CONFIGURED || ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, email")
    .in("id", ids);
  for (const row of (data ?? []) as { id: string; email: string | null }[]) {
    if (row.email) map.set(row.id, row.email);
  }
  return map;
}

export default async function AdminUsagePage() {
  const [totals, recent, caps, breakdown, history, perUser, banner] = await Promise.all([
    summarizeUsage(),
    recentUsage(50),
    getCapConfig(),
    breakdownUsage(WINDOW_MS.monthly),
    dailyHistory(7),
    spendByUser(WINDOW_MS.monthly),
    getBanner(),
  ]);
  const userEmails = await emailsForUserIds(
    perUser.map((u) => u.user_id).filter((id) => id !== "(unknown)")
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Usage & Costs</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          rolling window 기준 사용량. cap 은 아래 카드에서 즉시 편집.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CapCard label="Daily (24h)" current={totals.daily} limit={caps.daily} />
        <CapCard label="Weekly (7d)" current={totals.weekly} limit={caps.weekly} />
        <CapCard label="Monthly (30d)" current={totals.monthly} limit={caps.monthly} />
      </section>

      <CapsEditor initial={caps} />
      <BannerEditor initial={banner} />

      {/* 7-day daily trend */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            최근 7일
          </h2>
          <p className="text-xs text-zinc-500 tabular-nums">
            합계 {fmt(history.reduce((s, d) => s + d.cost, 0))}
          </p>
        </div>
        <Sparkline data={history} />
      </section>

      {/* Breakdowns */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownCard title="Route 별 (30d)" rows={breakdown.byRoute.map((r) => ({ name: r.route, cost: r.cost, count: r.count }))} />
        <BreakdownCard title="Model 별 (30d)" rows={breakdown.byModel.map((m) => ({ name: m.model, cost: m.cost, count: m.count }))} />
      </section>

      {perUser.length > 1 && (
        <section>
          <BreakdownCard
            title="Admin 별 (30d) — 다중 운영자 사용량"
            rows={perUser.map((u) => ({
              name:
                u.user_id === "(unknown)"
                  ? "(unknown)"
                  : userEmails.get(u.user_id) ?? u.user_id.slice(0, 8),
              cost: u.cost,
              count: u.count,
            }))}
          />
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            최근 50건
          </h2>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-600">
            아직 기록된 호출이 없습니다.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">
                    시각
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">
                    Route
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">
                    Model
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-xs uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recent.map((e, i) => (
                  <tr key={i} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-2 text-zinc-400 font-mono text-xs">
                      {new Date(e.created_at).toLocaleString("ko-KR", {
                        hour12: false,
                      })}
                    </td>
                    <td className="px-4 py-2">{e.route}</td>
                    <td className="px-4 py-2 text-zinc-400 font-mono text-xs">
                      {e.model}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {fmt(Number(e.cost_usd))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
