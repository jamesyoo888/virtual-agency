"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Loader2 } from "lucide-react";

interface Perf {
  views30d: number;
  inquiries30d: number;
  delivered30d: number;
  inquiryRate: number;
  lastInquiryAt: string | null;
}

/**
 * Tiny 30-day perf card embedded in /admin/models/[id]. Fetches once on
 * mount via /api/admin/models/<id>/perf — admin-only endpoint, so we don't
 * worry about pre-auth gating in the UI.
 */
export default function AdminModelPerfCard({ modelId }: { modelId: string }) {
  const [data, setData] = useState<Perf | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/models/${modelId}/perf`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Perf) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [modelId]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
        <h3 className="text-xs uppercase tracking-wider text-zinc-400">
          30일 성과
        </h3>
        <Link
          href="/admin/models/performance"
          className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-200"
        >
          ranking →
        </Link>
      </div>
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : !data ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          로드 중…
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2 text-center text-xs">
            <li>
              <p className="text-lg font-bold tabular-nums">
                {data.views30d.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500">views</p>
            </li>
            <li>
              <p className="text-lg font-bold tabular-nums">
                {data.inquiries30d.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500">문의</p>
            </li>
            <li>
              <p className="text-lg font-bold tabular-nums">
                {data.delivered30d.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500">납품</p>
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-zinc-800 text-xs flex items-center justify-between">
            <span className="text-zinc-500">smoothed inquiry rate</span>
            <span className="tabular-nums font-medium text-emerald-300">
              {(data.inquiryRate * 100).toFixed(1)}%
            </span>
          </div>
          {data.lastInquiryAt && (
            <p className="mt-2 text-[10px] text-zinc-500">
              최근 문의 {new Date(data.lastInquiryAt).toLocaleDateString("ko-KR")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
