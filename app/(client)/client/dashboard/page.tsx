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
import { loadReferralStats } from "@/lib/referral/stats";

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
  const referralStats = await loadReferralStats(user.id);

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

      {/*
        Next-step CTAs — derived from the client's actual project state.
        Order: matters most → least urgent.
        - No projects: encourage AI matching (most likely to convert).
        - Has pending inquiry: surface FAQ + share contact info so client
          doesn't re-ask common questions.
        - Has delivered + no review yet: nudge for testimonial.
      */}
      {(() => {
        const list = (projects ?? []) as { status: string; id: string }[];
        const hasAny = list.length > 0;
        const hasPendingInquiry = list.some(
          (p) =>
            p.status === "inquiry" ||
            p.status === "brief_received" ||
            p.status === "in_progress"
        );
        const deliveredWithoutReview = list.find(
          (p) => p.status === "delivered" && !reviewByProject.has(p.id)
        );
        const ctas: { href: string; label: string; sub: string }[] = [];
        if (!hasAny) {
          ctas.push({
            href: "/match",
            label: "AI 매칭 받기",
            sub: "1줄 브리프로 어울리는 모델 3~5명 추천",
          });
          ctas.push({
            href: "/pricing",
            label: "가격 확인",
            sub: "3가지 시나리오 + 즉시 견적 계산기",
          });
        } else if (hasPendingInquiry) {
          ctas.push({
            href: "/faq",
            label: "자주 묻는 질문",
            sub: "응답 SLA·납기·라이선스 답변 모음",
          });
          ctas.push({
            href: "/brief-template",
            label: "브리프 보강",
            sub: "9 섹션 가이드 — 매칭 정확도 향상",
          });
        } else if (deliveredWithoutReview) {
          ctas.push({
            href: `/client/quote/${deliveredWithoutReview.id}`,
            label: "후기 작성",
            sub: "성과를 익명 사례로 — 향후 캠페인 단가 협상력",
          });
          ctas.push({
            href: "/match",
            label: "다음 캠페인 매칭",
            sub: "이전 캠페인 데이터 기반 personalized 추천",
          });
        } else {
          ctas.push({
            href: "/trending",
            label: "트렌딩 모델",
            sub: "최근 30일 가장 많이 본 모델 12명",
          });
        }
        return ctas.length > 0 ? (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {ctas.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-600 transition-colors group"
              >
                <p className="text-sm font-medium group-hover:underline">
                  {c.label} →
                </p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {c.sub}
                </p>
              </Link>
            ))}
          </div>
        ) : null;
      })()}

      <div className="mb-6 space-y-3">
        <ReferralLinkButton />
        {referralStats.inquiries > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              내 추천 현황
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-zinc-500">접수된 문의</p>
                <p className="font-semibold tabular-nums">
                  {referralStats.inquiries}건
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">납품 완료</p>
                <p className="font-semibold tabular-nums">
                  {referralStats.delivered}건
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">고유 광고주</p>
                <p className="font-semibold tabular-nums">
                  {referralStats.uniqueReferees}명
                </p>
              </div>
            </div>
            {referralStats.lastReferralAt && (
              <p className="text-[11px] text-zinc-600 mt-3">
                최근 추천 문의:{" "}
                {new Date(referralStats.lastReferralAt).toLocaleDateString("ko-KR")}
              </p>
            )}
          </div>
        )}
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
