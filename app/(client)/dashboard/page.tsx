import { createClient } from "@/lib/supabase/server";
import { Project } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

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

  const { data: projects } = await supabase
    .from("projects")
    .select("*, model:models(name, concept_image)")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/client/projects/new">
          <Button className="bg-white text-black hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </Link>
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
              className="flex items-center gap-4 bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800 transition-colors"
            >
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
              <p className="text-xs text-zinc-500 shrink-0">
                {new Date(p.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
