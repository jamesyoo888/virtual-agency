import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import CreatorOnboardForm from "@/components/creator-onboard-form";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "크리에이터 신청 — Virtual Agency", robots: { index: false } };

interface ApplicationRow {
  id: string;
  display_name: string;
  bio: string | null;
  portfolio_url: string | null;
  instagram_handle: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export default async function CreatorOnboardPage() {
  if (!SUPABASE_CONFIGURED) {
    return <p className="text-sm text-zinc-500">Supabase 가 연결되지 않았습니다.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/creator/onboard");

  const { data: existing } = await supabase
    .from("creator_applications")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();
  const application = existing as ApplicationRow | null;

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-zinc-400" />
          <h1 className="text-2xl font-bold">크리에이터 신청</h1>
        </div>
        <p className="text-sm text-zinc-500">
          자체 제작한 버추얼 모델을 Virtual Agency 카탈로그에 등록하세요. 운영팀이
          포트폴리오 검토 후 승인합니다.
        </p>
      </header>

      {application?.status === "approved" && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 mb-6">
          <p className="text-sm font-medium text-emerald-300">신청이 승인되었습니다.</p>
          <p className="text-xs text-emerald-200/80 mt-1">
            운영팀이 모델 등록을 진행 중입니다. 모델이 연결되면 대시보드에서 확인할 수 있어요.
          </p>
        </div>
      )}
      {application?.status === "rejected" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 mb-6">
          <p className="text-sm font-medium text-red-300">신청이 반려되었습니다.</p>
          {application.rejection_reason && (
            <p className="text-xs text-red-200/80 mt-1">{application.rejection_reason}</p>
          )}
          <p className="text-xs text-zinc-400 mt-2">아래 폼을 수정해 다시 제출하시면 재검토됩니다.</p>
        </div>
      )}
      {application?.status === "pending" && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6">
          <p className="text-sm font-medium text-yellow-300">검토 대기 중입니다.</p>
          <p className="text-xs text-yellow-200/80 mt-1">
            대개 영업일 기준 2일 이내 회신드립니다.
          </p>
        </div>
      )}

      <CreatorOnboardForm initial={application} />
    </div>
  );
}
