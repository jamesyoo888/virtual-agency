import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import CreatorApplicationModerateButtons from "@/components/creator-application-moderate-buttons";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creators — Virtual Agency" };

interface ApplicationRow {
  id: string;
  client_id: string;
  display_name: string;
  bio: string | null;
  portfolio_url: string | null;
  instagram_handle: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  client?: { email: string | null; company: string | null } | null;
}

const STATUS_CLS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
};

async function loadApplications(filter: string | undefined): Promise<ApplicationRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  let query = supabase
    .from("creator_applications")
    .select(
      "id, client_id, display_name, bio, portfolio_url, instagram_handle, notes, status, rejection_reason, created_at, reviewed_at, client:clients(email, company)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter && ["pending", "approved", "rejected"].includes(filter)) {
    query = query.eq("status", filter);
  }
  const { data } = await query;
  return (data as unknown as ApplicationRow[]) ?? [];
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminCreatorsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = sp.status ?? "pending";
  const rows = await loadApplications(status);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-bold">크리에이터 신청</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              외부 크리에이터의 등록 요청 — 승인 후 모델을 owner_id 로 연결하세요.
            </p>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Content-Disposition download */}
        <a
          href="/api/admin/exports/creators"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      <nav className="flex gap-2 text-xs">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/creators" : `/admin/creators?status=${s}`}
            className={`px-3 py-1.5 rounded-md border ${
              (s === "all" && !sp.status) || sp.status === s
                ? "bg-white text-black border-white"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
            }`}
          >
            {s === "all" ? "전체" : s}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">해당 상태의 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.display_name}
                    <span className={`ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_CLS[r.status]}`}>
                      {r.status}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {r.client?.company || r.client?.email || r.client_id.slice(0, 8)} ·{" "}
                    신청일 {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    {r.reviewed_at && ` · 검토 ${new Date(r.reviewed_at).toLocaleDateString("ko-KR")}`}
                  </p>
                </div>
                {r.portfolio_url && (
                  <a
                    href={r.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 shrink-0"
                  >
                    포트폴리오 ↗
                  </a>
                )}
              </div>
              {r.bio && (
                <p className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{r.bio}</p>
              )}
              {r.notes && (
                <p className="mt-2 text-xs text-zinc-500 whitespace-pre-wrap">노트: {r.notes}</p>
              )}
              {r.rejection_reason && (
                <p className="mt-2 text-xs text-red-400">반려 사유: {r.rejection_reason}</p>
              )}
              {r.status === "pending" && (
                <div className="mt-4">
                  <CreatorApplicationModerateButtons id={r.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
