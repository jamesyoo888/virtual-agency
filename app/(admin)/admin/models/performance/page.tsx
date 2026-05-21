import Link from "next/link";
import { Activity, TrendingUp } from "lucide-react";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { loadModelPerformance } from "@/lib/analytics/model-performance";

export const dynamic = "force-dynamic";

export const metadata = { title: "Model Performance — Virtual Agency Admin" };

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function ModelPerformancePage() {
  const report = await loadModelPerformance(30);
  // Top half of the list (by smoothed rate) is what operations actually act
  // on — the long tail is mostly "no signal yet" and would otherwise crowd
  // the page. Capped at 50 so the page stays scroll-friendly.
  const top = report.rows.slice(0, 50);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Activity className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Model Performance</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            30일 카탈로그 View → Inquiry → Delivered 전환. 스무딩 적용된 inquiry rate 로 정렬 (신규 모델 페널티 방지).
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- needs real navigation for Content-Disposition download */}
        <a
          href="/api/admin/exports/model-performance"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="총 view" value={report.totalViews.toLocaleString()} />
        <Stat label="총 inquiry" value={report.totalInquiries.toLocaleString()} />
        <Stat label="총 delivered" value={report.totalDelivered.toLocaleString()} />
        <Stat
          label="평균 inquiry rate"
          value={
            report.totalViews > 0
              ? pct(report.totalInquiries / report.totalViews)
              : "—"
          }
        />
      </section>

      {!SUPABASE_CONFIGURED ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          Supabase 미설정 — production 에서만 동작합니다.
        </div>
      ) : top.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          데이터가 충분히 쌓이지 않았습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">모델</th>
                <th className="text-right px-4 py-3">View</th>
                <th className="text-right px-4 py-3">Inquiry</th>
                <th className="text-right px-4 py-3">Delivered</th>
                <th className="text-right px-4 py-3 whitespace-nowrap">
                  Inquiry rate
                </th>
                <th className="text-right px-4 py-3 whitespace-nowrap">
                  Close rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {top.map((r) => {
                const aboveAvg =
                  report.totalViews > 0 &&
                  r.inquiryRate > report.totalInquiries / report.totalViews;
                return (
                  <tr key={r.modelId} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-3 min-w-0">
                      <Link
                        href={`/admin/models/${r.modelId}`}
                        className="font-medium hover:text-white"
                      >
                        {r.name}
                      </Link>
                      {r.status !== "active" && (
                        <span className="ml-2 text-[10px] text-zinc-500 uppercase">
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {r.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.inquiries.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.delivered.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        aboveAvg ? "text-emerald-300" : "text-zinc-400"
                      }`}
                    >
                      {pct(r.inquiryRate)}
                      {aboveAvg && (
                        <TrendingUp className="inline w-3 h-3 ml-1" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {r.closeRate != null ? pct(r.closeRate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-600 max-w-3xl">
        Inquiry rate 는 (inquiries + 1.5) / (views + 50) 스무딩 — 신규 모델이 view 부족만으로 하위에 묻히지 않도록 카탈로그 기준선 ~3% 를 prior 로 사용. Close rate 는 delivered / inquiries (스무딩 없음).
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/30">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
