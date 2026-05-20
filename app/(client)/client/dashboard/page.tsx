import { createClient } from "@/lib/supabase/server";
import { Project } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import ProjectTimeline from "@/components/project-timeline";
import DashboardStatusWatcher from "@/components/dashboard-status-watcher";
import ReviewSubmit from "@/components/review-submit";
import ReferralLinkButton from "@/components/referral-link-button";
import { getClientPreferences } from "@/lib/preferences";

const STATUS_LABELS: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

const STATUS_COLORS: Record<string, string> = {
  inquiry: "bg-yellow-500/20 text-yellow-400",
  brief_received: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  review: "bg-orange-500/20 text-orange-400",
  delivered: "bg-green-500/20 text-green-400",
};

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout middleware redirects unauthenticated users; this guard satisfies the
  // type-checker and prevents a server crash if the page is reached out-of-order.
  if (!user) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("*, model:models(name, concept_image)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  // Pre-fetch the client's existing reviews so a delivered project that
  // already has a pending/approved review hides the submit form. One query
  // is cheaper than per-row lookups when rendering the list.
  const { data: ownReviews } = await supabase
    .from("reviews")
    .select("project_id, status")
    .eq("client_id", user.id);
  const reviewByProject = new Map(
    (ownReviews ?? []).map((r) => [r.project_id as string, r.status as "pending" | "approved" | "rejected"])
  );

  // Pull the recent status transitions for these projects in a single batch.
  // RLS lets the client read their own project history (see migration 019).
  // We tolerate a missing table (migration not yet applied) so the dashboard
  // still renders during rollout.
  const projectIds = (projects ?? []).map((p) => p.id);
  type HistoryRow = { project_id: string; to_status: string; changed_at: string };
  const historyByProject = new Map<string, HistoryRow[]>();
  if (projectIds.length > 0) {
    const { data: history } = await supabase
      .from("project_status_history")
      .select("project_id, to_status, changed_at")
      .in("project_id", projectIds)
      .order("changed_at", { ascending: false });
    for (const row of ((history ?? []) as HistoryRow[])) {
      const list = historyByProject.get(row.project_id) ?? [];
      list.push(row);
      historyByProject.set(row.project_id, list);
    }
  }

  const watcherInitial = (projects ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
  }));

  const prefs = await getClientPreferences(user.id);

  return (
    <div>
      <DashboardStatusWatcher
        initial={watcherInitial}
        toastEnabled={prefs.toast_status_changes}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/client/projects/new">
          <Button className="bg-white text-black hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <ReferralLinkButton />
      </div>

      {!projects || projects.length === 0 ? (
        <div className="text-center py-24 text-zinc-500 bg-zinc-900 rounded-xl">
          <p className="text-lg">진행 중인 프로젝트가 없습니다.</p>
          <p className="text-sm mt-2">새 프로젝트를 생성하여 버추얼 모델 제작을 시작하세요.</p>
          <Link href="/client/projects/new" className="mt-6 inline-block">
            <Button className="bg-white text-black hover:bg-zinc-200 mt-4">시작하기</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(projects as (Project & { model?: { name: string; concept_image: string | null } })[]).map((p) => (
            <div
              key={p.id}
              className="bg-zinc-900 rounded-xl p-5 space-y-5 hover:bg-zinc-900/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                  {p.model?.concept_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.model.concept_image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-sm text-zinc-400">{p.model?.name ?? "모델 미선택"}</p>
                </div>
                <Badge className={STATUS_COLORS[p.status]}>
                  {STATUS_LABELS[p.status]}
                </Badge>
                <Link
                  href={`/client/quote/${p.id}`}
                  className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 shrink-0"
                >
                  견적서
                </Link>
                <p className="text-xs text-zinc-500 shrink-0">
                  {new Date(p.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <ProjectTimeline status={p.status} />
              {(() => {
                const recent = (historyByProject.get(p.id) ?? []).slice(0, 3);
                if (recent.length === 0) return null;
                return (
                  <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-zinc-600 uppercase tracking-wider">최근 변경</span>
                    {recent.map((h, i) => (
                      <span key={i} className="tabular-nums">
                        {STATUS_LABELS[h.to_status] ?? h.to_status}
                        <span className="text-zinc-600 ml-1">
                          {new Date(h.changed_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        </span>
                      </span>
                    ))}
                  </div>
                );
              })()}
              {p.status === "delivered" && (
                <ReviewSubmit
                  projectId={p.id}
                  projectTitle={p.title}
                  existingStatus={reviewByProject.get(p.id) ?? null}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
