import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Referrals — Virtual Agency Admin" };

interface ReferralRow {
  utm_campaign: string | null;
  status: string;
  invoice_amount: number | null;
}

interface Leader {
  clientId: string;
  email: string | null;
  company: string | null;
  inquiries: number;
  delivered: number;
  revenue: number;
}

async function loadLeaderboard(): Promise<{
  leaders: Leader[];
  totalReferred: number;
  totalRevenue: number;
}> {
  if (!SUPABASE_CONFIGURED) {
    return { leaders: [], totalReferred: 0, totalRevenue: 0 };
  }
  const supabase = await createClient();

  const { data: refs } = await supabase
    .from("projects")
    .select("utm_campaign, status, invoice_amount")
    .eq("utm_source", "referral")
    .limit(5000);

  const rows = (refs as ReferralRow[]) ?? [];
  const byCode = new Map<
    string,
    { inquiries: number; delivered: number; revenue: number }
  >();
  for (const r of rows) {
    const code = r.utm_campaign;
    if (!code) continue;
    const prev = byCode.get(code) ?? { inquiries: 0, delivered: 0, revenue: 0 };
    prev.inquiries += 1;
    if (r.status === "delivered") {
      prev.delivered += 1;
      prev.revenue += r.invoice_amount ?? 0;
    }
    byCode.set(code, prev);
  }

  const codes = [...byCode.keys()];
  const profiles = new Map<
    string,
    { email: string | null; company: string | null }
  >();
  if (codes.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, email, company")
      .in("id", codes);
    for (const c of ((clients ?? []) as Array<{
      id: string;
      email: string | null;
      company: string | null;
    }>)) {
      profiles.set(c.id, { email: c.email, company: c.company });
    }
  }

  const leaders: Leader[] = [...byCode.entries()]
    .map(([clientId, stats]) => {
      const p = profiles.get(clientId) ?? { email: null, company: null };
      return {
        clientId,
        email: p.email,
        company: p.company,
        ...stats,
      };
    })
    .sort((a, b) => b.inquiries - a.inquiries);

  const totalReferred = rows.length;
  const totalRevenue = leaders.reduce((sum, l) => sum + l.revenue, 0);

  return { leaders, totalReferred, totalRevenue };
}

const KRW = new Intl.NumberFormat("ko-KR");

export default async function AdminReferralsPage() {
  const { leaders, totalReferred, totalRevenue } = await loadLeaderboard();

  return (
    <div className="p-8 max-w-5xl mx-auto text-zinc-100">
      <header className="mb-8 flex items-center gap-3">
        <Users className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            utm_source=referral 인 inbound projects 의 referrer 리더보드.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">{leaders.length}</p>
          <p className="text-xs text-zinc-500 mt-1">활성 referrer</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">{totalReferred}</p>
          <p className="text-xs text-zinc-500 mt-1">추천 인입 캠페인</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
          <p className="text-2xl font-semibold tabular-nums">
            ₩{KRW.format(totalRevenue)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">추천 누적 매출</p>
        </div>
      </section>

      {leaders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          {!SUPABASE_CONFIGURED
            ? "Supabase 미설정 — production 에서만 동작합니다."
            : "아직 추천 인입이 없습니다. 클라이언트에게 /client/dashboard 의 추천 링크를 공유해 보세요."}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">Referrer</th>
                <th className="text-right px-4 py-3">인입</th>
                <th className="text-right px-4 py-3">납품</th>
                <th className="text-right px-4 py-3">전환</th>
                <th className="text-right px-4 py-3">누적 매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {leaders.map((l) => (
                <tr key={l.clientId} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-3 min-w-0">
                    <p className="font-medium truncate">
                      {l.company ?? l.email ?? l.clientId.slice(0, 8)}
                    </p>
                    {l.email && l.company && (
                      <p className="text-xs text-zinc-500 truncate">
                        {l.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <Link
                      href={`/admin/inbox?q=${encodeURIComponent(
                        l.clientId.slice(0, 8)
                      )}`}
                      className="text-zinc-200 hover:underline"
                    >
                      {l.inquiries}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {l.delivered}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {l.inquiries > 0
                      ? `${Math.round((l.delivered / l.inquiries) * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {l.revenue > 0 ? `₩${KRW.format(l.revenue)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
