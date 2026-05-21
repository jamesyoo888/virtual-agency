import { loadSearchAnalytics, type SearchAggregate } from "@/lib/analytics/search-log";
import { Search, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Search Analytics — Virtual Agency Admin" };

function QueryRow({ row, highlight }: { row: SearchAggregate; highlight?: boolean }) {
  const zeroPct = row.count > 0 ? (row.zeroResultCount / row.count) * 100 : 0;
  return (
    <tr className="hover:bg-zinc-900/30 align-middle">
      <td className="px-4 py-2.5">
        <Link
          href={`/?q=${encodeURIComponent(row.q)}`}
          className="text-sm text-zinc-200 hover:text-white underline-offset-2 hover:underline"
        >
          {row.q}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-300">
        {row.count}
      </td>
      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-400">
        {row.avgResults.toFixed(1)}
      </td>
      <td className="px-4 py-2.5 text-sm tabular-nums">
        <span
          className={
            highlight && zeroPct >= 50
              ? "text-red-400"
              : zeroPct > 0
              ? "text-yellow-400"
              : "text-zinc-500"
          }
        >
          {row.zeroResultCount} ({zeroPct.toFixed(0)}%)
        </span>
      </td>
    </tr>
  );
}

export default async function AdminSearchAnalyticsPage() {
  const [last7, last30] = await Promise.all([
    loadSearchAnalytics({ windowDays: 7, limit: 20 }),
    loadSearchAnalytics({ windowDays: 30, limit: 20 }),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Search className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Search Analytics</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            카탈로그 검색어 집계. <code>route=&apos;search.catalog&apos;</code> from usage_log.
          </p>
        </div>
        <a
          href="/api/admin/exports/search?window=30"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV (30일)
        </a>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-8 max-w-md">
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-950/40">
          <p className="text-2xl font-semibold tabular-nums">
            {last7.totalQueries}
          </p>
          <p className="text-xs text-zinc-500 mt-1">최근 7일 검색 수</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-950/40">
          <p className="text-2xl font-semibold tabular-nums">
            {last30.totalQueries}
          </p>
          <p className="text-xs text-zinc-500 mt-1">최근 30일 검색 수</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">인기 검색어 (7일)</h2>
        {last7.top.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
            아직 수집된 검색어가 없습니다.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3">검색어</th>
                  <th className="text-left px-4 py-3">횟수</th>
                  <th className="text-left px-4 py-3">평균 결과</th>
                  <th className="text-left px-4 py-3">0결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {last7.top.map((r) => (
                  <QueryRow key={r.q} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          0결과 검색어 (30일) — 콘텐츠 갭
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          광고주가 찾았지만 매칭되는 모델이 없었던 검색어. /explore 랜딩 페이지·
          모델 bio·neue 카테고리 단서로 활용하세요.
        </p>
        {last30.zero.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
            0결과 검색어가 없습니다. 카탈로그 커버리지가 충분합니다.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/40 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3">검색어</th>
                  <th className="text-left px-4 py-3">횟수</th>
                  <th className="text-left px-4 py-3">평균 결과</th>
                  <th className="text-left px-4 py-3">0결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {last30.zero.map((r) => (
                  <QueryRow key={r.q} row={r} highlight />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
