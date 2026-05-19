import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadCreatorDashboard } from "@/lib/creator/dashboard";
import { Eye, Inbox, CheckCircle2, ImageOff } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator — Virtual Agency", robots: { index: false } };

export default async function CreatorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout already redirected

  const data = await loadCreatorDashboard(user.id);

  if (!data.isCreator) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-3">크리에이터 등록이 필요합니다</h1>
        <p className="text-sm text-zinc-500 mb-6">
          현재 계정에는 본인이 소유한 모델이 없습니다. 외부 크리에이터로 작품을 등록하려면
          신청서를 작성해 주세요.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/creator/onboard"
            className="inline-flex items-center gap-1.5 text-sm bg-white text-black px-4 py-2 rounded-md hover:bg-zinc-200"
          >
            크리에이터 신청
          </Link>
          <Link
            href="/client/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white underline underline-offset-2"
          >
            ← 클라이언트 대시보드
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">크리에이터 대시보드</h1>
        <p className="text-sm text-zinc-500 mt-1">
          내 모델의 노출과 문의를 한눈에. 데이터는 최근 30일 기준입니다.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="등록 모델" value={data.totals.models.toLocaleString()} />
        <StatCard label="조회 (30d)" value={data.totals.views30d.toLocaleString()} icon={<Eye className="w-3.5 h-3.5" />} />
        <StatCard label="신규 문의 (30d)" value={data.totals.inquiries30d.toLocaleString()} icon={<Inbox className="w-3.5 h-3.5" />} />
        <StatCard label="납품 완료 (누적)" value={data.totals.deliveredAllTime.toLocaleString()} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <header className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            내 모델
          </h2>
          <p className="text-xs text-zinc-600">
            {data.rows.length}개 / 30일 데이터
          </p>
        </header>
        <ul className="divide-y divide-zinc-800">
          {data.rows.map(({ model, views30d, inquiries30d, deliveredAllTime }) => {
            const conversion =
              views30d > 0 ? Math.round((inquiries30d / views30d) * 100) : 0;
            return (
              <li key={model.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0 grid place-items-center">
                  {model.concept_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={model.concept_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/models/${model.id}`}
                    className="text-sm font-medium hover:text-zinc-300 truncate block"
                  >
                    {model.name}
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                    <StatusPill status={model.status} />
                    {model.base_price && (
                      <span className="tabular-nums">
                        일 ₩{model.base_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm tabular-nums">
                  <Metric label="조회" value={views30d} />
                  <Metric label="문의" value={inquiries30d} />
                  <Metric label="납품" value={deliveredAllTime} />
                  <Metric label="전환" value={`${conversion}%`} highlight={conversion >= 5} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-zinc-600">
        조회는 봇을 제외한 visitor cookie 기준. 전환 = 30일 문의수 ÷ 30일 조회수.
      </p>
    </div>
  );
}

function StatCard({
  label, value, icon,
}: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Metric({
  label, value, highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={highlight ? "text-emerald-400 font-semibold" : "text-zinc-200"}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "draft"
      ? "bg-zinc-500/15 text-zinc-400"
      : "bg-yellow-500/15 text-yellow-400";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
