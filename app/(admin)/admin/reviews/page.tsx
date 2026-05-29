import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Star, Download } from "lucide-react";
import ReviewModerateButtons from "@/components/review-moderate-buttons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews — Virtual Agency Admin" };

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  project_id: string;
  model_id: string;
  client_id: string;
  model?: { name: string | null } | null;
  client?: { email: string | null; company: string | null } | null;
  project?: { title: string | null } | null;
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-green-500/15 text-green-300 border-green-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인",
  rejected: "거부",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

async function fetchReviews(statusFilter?: string): Promise<ReviewRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select(
      "id, rating, comment, status, rejection_reason, created_at, reviewed_at, project_id, model_id, client_id, model:models(name), client:clients(email, company), project:projects(title)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data } = await q;
  return (data as unknown as ReviewRow[]) ?? [];
}

export default async function AdminReviewsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const reviews = await fetchReviews(status);

  const counts: Record<string, number> = { all: 0 };
  for (const r of reviews) counts[r.status] = (counts[r.status] ?? 0) + 1;
  counts.all = reviews.length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Star className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            클라이언트 리뷰 모더레이션 — 승인 시 공개 상세에 노출
          </p>
        </div>
        <a
          href="/api/admin/exports/reviews"
          download
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-md px-2.5 py-1.5"
          title="모든 리뷰 CSV 다운로드"
        >
          <Download className="w-3 h-3" />
          CSV
        </a>
      </header>

      <nav className="flex flex-wrap gap-1 mb-6 text-xs">
        {[
          { value: "pending", label: "검토 대기" },
          { value: "approved", label: "승인" },
          { value: "rejected", label: "거부" },
          { value: "all", label: "전체" },
        ].map((tab) => {
          const active = (status ?? "pending") === tab.value;
          const href =
            tab.value === "pending"
              ? "/admin/reviews"
              : `/admin/reviews?status=${tab.value}`;
          return (
            <a
              key={tab.value}
              href={href}
              className={`px-3 py-1.5 rounded-md border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-60">{counts[tab.value] ?? 0}</span>
            </a>
          );
        })}
      </nav>

      {!SUPABASE_CONFIGURED ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          Supabase 미설정 — Reviews 는 production 에서만 동작합니다.
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          해당 상태의 리뷰가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={r.rating} />
                    <span className="text-xs text-zinc-500">
                      {r.rating}.0 · {r.model?.name ?? "모델 없음"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {r.client?.company || r.client?.email || "익명"}
                    <span className="mx-1.5 text-zinc-700">·</span>
                    프로젝트: {r.project?.title ?? r.project_id.slice(0, 8)}
                    <span className="mx-1.5 text-zinc-700">·</span>
                    {new Date(r.created_at).toLocaleString("ko-KR", { hour12: false })}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                    STATUS_TONE[r.status] ?? ""
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>

              {r.comment && (
                <p className="text-sm text-zinc-300 mt-3 whitespace-pre-wrap leading-relaxed">
                  {r.comment}
                </p>
              )}

              {r.status === "rejected" && r.rejection_reason && (
                <p className="text-xs text-red-300/80 mt-3 italic">
                  거부 사유: {r.rejection_reason}
                </p>
              )}

              {r.status === "pending" && (
                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <ReviewModerateButtons reviewId={r.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
