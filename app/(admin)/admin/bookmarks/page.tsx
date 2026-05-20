import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Heart } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookmarks — Virtual Agency" };

interface BookmarkRow {
  id: string;
  created_at: string;
  client_id: string;
  model_id: string;
  client?: { email: string | null; company: string | null } | null;
  model?: { name: string | null; slug: string | null } | null;
}

async function loadBookmarks(): Promise<BookmarkRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("model_bookmarks")
    .select(
      "id, created_at, client_id, model_id, client:clients(email, company), model:models(name, slug)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as unknown as BookmarkRow[]) ?? [];
}

export default async function AdminBookmarksPage() {
  const rows = await loadBookmarks();

  // Roll up per-model demand so the admin can see which models are getting
  // hearted most — a softer pre-inquiry signal than the RFP funnel.
  const perModel = new Map<string, { name: string; slug: string; count: number }>();
  for (const r of rows) {
    if (!r.model_id) continue;
    const k = r.model_id;
    const existing = perModel.get(k);
    if (existing) {
      existing.count += 1;
    } else {
      perModel.set(k, {
        name: r.model?.name ?? "?",
        slug: r.model?.slug ?? "",
        count: 1,
      });
    }
  }
  const top = [...perModel.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-bold">북마크</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              클라이언트가 저장한 모델 — 문의 이전 단계의 관심 신호.
            </p>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Content-Disposition download */}
        <a
          href="/api/admin/exports/bookmarks"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      {top.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            가장 많이 저장된 모델
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {top.map(([id, info]) => (
              <li key={id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/admin/models/${id}`}
                  className="text-zinc-200 hover:text-white truncate"
                >
                  {info.name}
                </Link>
                <span className="text-zinc-500 tabular-nums">{info.count}회</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <header className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            최근 북마크
          </h2>
          <p className="text-xs text-zinc-600">{rows.length}건</p>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-500">아직 북마크가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/models/${r.model_id}`}
                    className="font-medium text-zinc-100 hover:text-white truncate"
                  >
                    {r.model?.name ?? "(deleted model)"}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {r.client?.company || r.client?.email || r.client_id.slice(0, 8)}
                    {" · "}
                    {new Date(r.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
