import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { summarizeUsage } from "@/lib/cost/store";
import {
  Users,
  Inbox,
  Receipt,
  PlayCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Virtual Agency" };

interface KPIs {
  newInquiries24h: number;
  activeProjects: number;
  totalModels: number;
  activeModels: number;
}

interface RecentInquiry {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_company: string | null;
  model_name: string | null;
}

async function loadRecentInquiries(): Promise<RecentInquiry[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, status, created_at, client:clients(company), model:models(name)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  type Row = {
    id: string;
    title: string;
    status: string;
    created_at: string;
    client: { company: string | null } | null;
    model: { name: string | null } | null;
  };
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    created_at: r.created_at,
    client_company: r.client?.company ?? null,
    model_name: r.model?.name ?? null,
  }));
}

async function loadKPIs(): Promise<KPIs> {
  if (!SUPABASE_CONFIGURED) {
    const list = devModelStore.list();
    return {
      newInquiries24h: 0,
      activeProjects: 0,
      totalModels: list.length,
      activeModels: list.filter((m) => m.status === "active").length,
    };
  }
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: newInquiries24h },
    { count: activeProjects },
    { count: totalModels },
    { count: activeModels },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "inquiry")
      .gte("created_at", since),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .in("status", ["brief_received", "in_progress", "review"]),
    supabase.from("models").select("id", { count: "exact", head: true }),
    supabase
      .from("models")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    newInquiries24h: newInquiries24h ?? 0,
    activeProjects: activeProjects ?? 0,
    totalModels: totalModels ?? 0,
    activeModels: activeModels ?? 0,
  };
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  inquiry: "bg-yellow-500/20 text-yellow-400",
  brief_received: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  review: "bg-orange-500/20 text-orange-400",
  delivered: "bg-green-500/20 text-green-400",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품",
};

export default async function AdminHomePage() {
  const [kpis, usage, recent] = await Promise.all([
    loadKPIs(),
    summarizeUsage(),
    loadRecentInquiries(),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-zinc-500 mt-1">
          오늘의 핵심 지표와 빠른 이동.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          icon={Inbox}
          label="신규 문의 (24h)"
          value={kpis.newInquiries24h.toLocaleString()}
          href="/admin/inbox?status=inquiry"
          accent={kpis.newInquiries24h > 0 ? "bg-yellow-500/15 text-yellow-300" : ""}
        />
        <KPI
          icon={PlayCircle}
          label="진행 중 프로젝트"
          value={kpis.activeProjects.toLocaleString()}
          href="/admin/inbox?status=in_progress"
        />
        <KPI
          icon={Users}
          label="활성 모델"
          value={`${kpis.activeModels} / ${kpis.totalModels}`}
          href="/admin/models"
        />
        <KPI
          icon={Receipt}
          label="오늘 비용"
          value={`$${usage.daily.toFixed(2)}`}
          href="/admin/usage"
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <ShortcutCard
          title="새 모델 생성"
          desc="5단계 위저드 — 페르소나 → 컨셉 → 다각도 → 3D → 최종"
          href="/admin/models/new"
        />
        <ShortcutCard
          title="Image Studio"
          desc="단발 이미지 생성 (Easy Diffusion → FLUX → Pollinations 폴백)"
          href="/admin/image-studio"
        />
        <ShortcutCard
          title="Video Studio"
          desc="image-to-video (Kling/Minimax) + 립싱크"
          href="/admin/video-studio"
        />
      </section>

      {recent.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              최근 문의·프로젝트
            </h2>
            <Link
              href="/admin/inbox"
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
            >
              전체 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-zinc-800/70">
            {recent.map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3 text-sm">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                    STATUS_BADGE_COLORS[r.status] ?? "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-zinc-200">{r.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {r.client_company ?? "—"} ·{" "}
                    {r.model_name ?? "모델 미선택"}
                  </p>
                </div>
                <p className="text-xs text-zinc-500 tabular-nums shrink-0">
                  {new Date(r.created_at).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            비용 추세
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="24h" value={`$${usage.daily.toFixed(2)}`} />
          <Stat label="7d" value={`$${usage.weekly.toFixed(2)}`} />
          <Stat label="30d" value={`$${usage.monthly.toFixed(2)}`} />
        </div>
        <Link
          href="/admin/usage"
          className="inline-block mt-4 text-xs text-zinc-400 hover:text-white"
        >
          상세 + cap 편집 →
        </Link>
      </section>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  href,
  accent = "",
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className="w-4 h-4 text-zinc-500" />
      </div>
      <p
        className={`mt-3 text-2xl font-bold tabular-nums inline-block px-1.5 -mx-1.5 rounded ${accent}`}
      >
        {value}
      </p>
    </Link>
  );
}

function ShortcutCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900 transition-colors"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
