import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import ProjectStatusSelect from "@/components/project-status-select";
import InquiryAcceptButton from "@/components/inquiry-accept-button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "프로젝트 상세 — Virtual Agency Admin" };

const STATUS_LABEL: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

const STATUS_TONE: Record<string, string> = {
  inquiry: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  brief_received: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  in_progress: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  review: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  delivered: "bg-green-500/15 text-green-300 border-green-500/30",
};

interface HistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
}

interface ProjectDetail {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  model_id: string | null;
  invoice_amount: number | null;
  reference_images: string[] | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  model?: { name: string | null; concept_image: string | null } | null;
  client?: { email: string | null; company: string | null; name: string | null } | null;
}

async function fetchDetail(id: string): Promise<{
  project: ProjectDetail | null;
  history: HistoryRow[];
}> {
  if (!SUPABASE_CONFIGURED) return { project: null, history: [] };
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, brief, status, created_at, updated_at, client_id, model_id, invoice_amount, reference_images, utm_source, utm_medium, utm_campaign, referrer, model:models(name, concept_image), client:clients(email, company, name)"
    )
    .eq("id", id)
    .single();

  if (!project) return { project: null, history: [] };

  const { data: history } = await supabase
    .from("project_status_history")
    .select("id, from_status, to_status, changed_at")
    .eq("project_id", id)
    .order("changed_at", { ascending: false });

  return {
    project: project as unknown as ProjectDetail,
    history: ((history ?? []) as HistoryRow[]),
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { hour12: false });
}

function durationLabel(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 0 || !Number.isFinite(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, history } = await fetchDetail(id);
  if (!project) notFound();

  const KRW = new Intl.NumberFormat("ko-KR");

  return (
    <div className="p-8 max-w-4xl mx-auto text-zinc-100">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/inbox"
          className="text-zinc-400 hover:text-white inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Inbox
        </Link>
      </header>

      <div className="flex items-start gap-5 mb-6">
        {project.model?.concept_image && (
          <div className="w-20 aspect-[4/5] relative rounded bg-zinc-900 overflow-hidden shrink-0">
            <Image
              src={project.model.concept_image}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{project.title}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                STATUS_TONE[project.status] ??
                "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {project.model?.name ?? "모델 미선택"}
            {project.client?.company && ` · ${project.client.company}`}
            {project.client?.email && (
              <a
                href={`mailto:${project.client.email}`}
                className="ml-1 text-zinc-400 hover:text-white"
              >
                {project.client.email}
              </a>
            )}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            생성 {formatDateTime(project.created_at)} · 최종 수정{" "}
            {formatDateTime(project.updated_at)}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {project.status === "inquiry" && (
            <InquiryAcceptButton projectId={project.id} />
          )}
          <ProjectStatusSelect
            projectId={project.id}
            currentStatus={project.status}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <section className="md:col-span-2 rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            브리프
          </h2>
          {project.brief ? (
            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {project.brief}
            </p>
          ) : (
            <p className="text-sm text-zinc-600">브리프가 비어 있습니다.</p>
          )}
        </section>

        <aside className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40 space-y-3 text-xs">
          <div>
            <p className="text-zinc-500 uppercase tracking-wider mb-1">견적</p>
            <p className="text-zinc-100 text-sm font-medium">
              {project.invoice_amount != null
                ? `₩${KRW.format(project.invoice_amount)}`
                : "미정"}
            </p>
          </div>
          {(project.utm_source ||
            project.utm_medium ||
            project.utm_campaign ||
            project.referrer) && (
            <div>
              <p className="text-zinc-500 uppercase tracking-wider mb-1">유입</p>
              {project.utm_source && (
                <p className="text-zinc-300">
                  {project.utm_source}
                  {project.utm_medium && ` / ${project.utm_medium}`}
                  {project.utm_campaign && ` · ${project.utm_campaign}`}
                </p>
              )}
              {!project.utm_source && project.referrer && (
                <p className="text-zinc-400 truncate">
                  {project.referrer.replace(/^https?:\/\//, "")}
                </p>
              )}
            </div>
          )}
          {project.reference_images && project.reference_images.length > 0 && (
            <div>
              <p className="text-zinc-500 uppercase tracking-wider mb-1">
                레퍼런스
              </p>
              <p className="text-zinc-300">
                {project.reference_images.length}장
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
          상태 타임라인 ({history.length}건)
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-600">
            아직 상태 전이 이력이 없습니다. (마이그레이션 019 미적용이거나
            첫 상태 변경 전)
          </p>
        ) : (
          <ol className="relative border-l border-zinc-800 ml-2 space-y-5">
            {history.map((row, idx) => {
              const next = history[idx - 1];
              const stayed = next
                ? durationLabel(row.changed_at, next.changed_at)
                : "";
              return (
                <li key={row.id} className="ml-4">
                  <span
                    className={`absolute -left-1.5 w-3 h-3 rounded-full border ${
                      STATUS_TONE[row.to_status] ??
                      "bg-zinc-800 border-zinc-700"
                    }`}
                  />
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="text-sm">
                      <span className="text-zinc-500">
                        {row.from_status
                          ? STATUS_LABEL[row.from_status] ?? row.from_status
                          : "—"}
                      </span>
                      <span className="text-zinc-600 mx-2">→</span>
                      <span className="font-medium">
                        {STATUS_LABEL[row.to_status] ?? row.to_status}
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-500 tabular-nums">
                      {formatDateTime(row.changed_at)}
                    </p>
                  </div>
                  {stayed && (
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      이 단계에서 {stayed} 머무름
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
