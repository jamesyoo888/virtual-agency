import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Newsletter — Virtual Agency Admin" };

interface Signup {
  id: string;
  email: string;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

async function loadSignups(): Promise<{
  signups: Signup[];
  bySource: { source: string; count: number }[];
  active: number;
  unsubscribed: number;
  last7d: number;
}> {
  if (!SUPABASE_CONFIGURED) {
    return { signups: [], bySource: [], active: 0, unsubscribed: 0, last7d: 0 };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_signups")
    .select("id, email, source, utm_source, utm_campaign, unsubscribed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const signups = (data ?? []) as Signup[];

  const counts = new Map<string, number>();
  let active = 0;
  let unsubscribed = 0;
  let last7d = 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const s of signups) {
    const src = s.source ?? "(unknown)";
    counts.set(src, (counts.get(src) ?? 0) + 1);
    if (s.unsubscribed_at) unsubscribed += 1;
    else active += 1;
    if (new Date(s.created_at).getTime() >= sevenDaysAgo) last7d += 1;
  }
  const bySource = [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return { signups, bySource, active, unsubscribed, last7d };
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export default async function NewsletterAdminPage() {
  const { signups, bySource, active, unsubscribed, last7d } = await loadSignups();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Mail className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            푸터 구독 폼에서 수집된 이메일. 향후 마케팅 provider 로 이전 예정.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Content-Disposition download */}
        <a
          href="/api/admin/exports/newsletter"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="총 등록" value={signups.length} />
        <StatCard label="활성" value={active} />
        <StatCard label="해지" value={unsubscribed} />
        <StatCard label="최근 7일 신규" value={last7d} />
      </section>

      {bySource.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            유입 소스
          </h2>
          <div className="flex flex-wrap gap-2">
            {bySource.map((b) => (
              <span
                key={b.source}
                className="text-xs px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300"
              >
                {b.source}{" "}
                <span className="text-zinc-500 tabular-nums">{b.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {signups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          아직 구독자가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">이메일</th>
                <th className="text-left px-4 py-3">소스</th>
                <th className="text-left px-4 py-3">UTM 캠페인</th>
                <th className="text-right px-4 py-3">상태</th>
                <th className="text-right px-4 py-3">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {signups.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-2.5 truncate">
                    <a
                      href={`mailto:${s.email}`}
                      className="text-zinc-200 hover:text-white"
                    >
                      {s.email}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {s.source ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500 truncate">
                    {s.utm_campaign ?? s.utm_source ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    {s.unsubscribed_at ? (
                      <span className="text-red-400">해지</span>
                    ) : (
                      <span className="text-emerald-400">활성</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums">
                    {new Date(s.created_at).toISOString().slice(0, 10)}
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
