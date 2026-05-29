import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  Inbox,
  Download,
  Flame,
  Sparkles,
  BookOpen,
  Calculator,
  Users,
} from "lucide-react";
import ProjectStatusSelect from "@/components/project-status-select";
import InquiryAcceptButton from "@/components/inquiry-accept-button";
import InboxSearch from "@/components/inbox-search";
import InboxBulkBar from "@/components/inbox-bulk-bar";
import { computeLeadScore, TIER_LABEL_KO, TIER_TONE } from "@/lib/analytics/lead-score";
import { parseBlogReferrer } from "@/lib/analytics/blog-attribution";
import {
  parsePathFromCampaign,
  pathLabelForAdmin,
} from "@/lib/analytics/pricing-calculator-attribution";

export const dynamic = "force-dynamic";

export const metadata = { title: "Inbox — Virtual Agency Admin" };

interface ProjectRow {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  created_at: string;
  client_id: string;
  model_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  model?: { name: string | null; concept_image: string | null } | null;
  client?: { email: string | null; company: string | null } | null;
}

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

async function fetchProjects(
  statusFilter?: string,
  q?: string,
  source?: string,
  stale?: boolean
): Promise<ProjectRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select(
      "id, title, brief, status, created_at, client_id, model_id, utm_source, utm_medium, utm_campaign, referrer, model:models(name, concept_image), client:clients(email, company)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  // Stale = still in `inquiry` status and older than 24h. We force the status
  // to `inquiry` here so the chip is self-contained — the operator doesn't
  // also have to set status=inquiry.
  if (stale) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.eq("status", "inquiry").lt("created_at", cutoff);
  } else if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
  if (source && source !== "all") {
    if (source === "(direct)") {
      // "(direct)" pseudo-source = no utm_source AND no referrer host. Surfaces
      // visitors who came in without any attribution signal.
      query = query.is("utm_source", null).is("referrer", null);
    } else {
      query = query.eq("utm_source", source);
    }
  }
  if (q && q.trim()) {
    // Escape ilike wildcards (% _) — Supabase escape token is backslash.
    const term = `%${q.trim().replace(/[%_]/g, "\\$&")}%`;
    // OR across title + brief; client/company live on a joined table so we
    // post-filter those in memory for the matched rows. Keeps the query a
    // single round-trip without a stored function.
    query = query.or(`title.ilike.${term},brief.ilike.${term}`);
  }
  const { data } = await query;
  let rows = (data as unknown as ProjectRow[]) ?? [];

  if (q && q.trim()) {
    // Server-side filter falls back to in-memory union for joined fields so
    // a search for "Acme Corp" hits projects whose company matches even when
    // title/brief don't.
    const supabaseAdmin = await createClient();
    const term = q.trim().toLowerCase();
    const { data: byClient } = await supabaseAdmin
      .from("projects")
      .select(
        "id, title, brief, status, created_at, client_id, model_id, model:models(name, concept_image), client:clients!inner(email, company)"
      )
      .or(`company.ilike.%${term}%,email.ilike.%${term}%`, {
        foreignTable: "clients",
      })
      .order("created_at", { ascending: false })
      .limit(200);
    const extra = (byClient as unknown as ProjectRow[]) ?? [];
    const seen = new Set(rows.map((r) => r.id));
    for (const r of extra) {
      if (!seen.has(r.id) && (!statusFilter || statusFilter === "all" || r.status === statusFilter)) {
        rows.push(r);
        seen.add(r.id);
      }
    }
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    rows = rows.slice(0, 200);
  }

  return rows;
}

interface Props {
  searchParams: Promise<{
    status?: string;
    q?: string;
    source?: string;
    sort?: string;
    stale?: string;
  }>;
}

async function loadSourceOptions(): Promise<string[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("projects")
    .select("utm_source")
    .gte("created_at", since)
    .not("utm_source", "is", null)
    .limit(2000);
  const rows = ((data ?? []) as { utm_source: string | null }[])
    .map((r) => r.utm_source!)
    .filter(Boolean);
  return Array.from(new Set(rows)).sort();
}

async function loadStaleInquiryCount(): Promise<number> {
  if (!SUPABASE_CONFIGURED) return 0;
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "inquiry")
    .lt("created_at", cutoff);
  return count ?? 0;
}

async function loadPriorDeliveredByClient(clientIds: string[]): Promise<Map<string, number>> {
  if (!SUPABASE_CONFIGURED || clientIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("client_id")
    .in("client_id", clientIds)
    .eq("status", "delivered");
  const counts = new Map<string, number>();
  for (const r of ((data ?? []) as { client_id: string }[])) {
    counts.set(r.client_id, (counts.get(r.client_id) ?? 0) + 1);
  }
  return counts;
}

export default async function AdminInboxPage({ searchParams }: Props) {
  const { status, q, source, sort, stale: staleParam } = await searchParams;
  const stale = staleParam === "1";
  const [projectsRaw, sourceOptions, staleCount] = await Promise.all([
    fetchProjects(status, q, source, stale),
    loadSourceOptions(),
    loadStaleInquiryCount(),
  ]);
  const priorByClient = await loadPriorDeliveredByClient(
    Array.from(new Set(projectsRaw.map((p) => p.client_id)))
  );

  // Lead scores computed once for inquiry rows. Sort=score reorders inquiries
  // by lead score desc; non-inquiry rows keep their date order regardless so
  // the operator's "in_progress" tab isn't shuffled.
  const projectsWithScore = projectsRaw.map((p) => {
    if (p.status !== "inquiry") return { row: p, leadScore: null, leadTier: null };
    const lead = computeLeadScore({
      utmSource: p.utm_source,
      utmCampaign: p.utm_campaign,
      referrer: p.referrer,
      brief: p.brief,
      createdAt: p.created_at,
      priorDeliveredCount: priorByClient.get(p.client_id) ?? 0,
    });
    return { row: p, leadScore: lead.score, leadTier: lead.tier };
  });

  const projects =
    sort === "score"
      ? [...projectsWithScore].sort((a, b) => {
          // Inquiry rows sorted by score desc; non-inquiries pushed to bottom
          // by date desc.
          if (a.row.status === "inquiry" && b.row.status === "inquiry") {
            return (b.leadScore ?? 0) - (a.leadScore ?? 0);
          }
          if (a.row.status === "inquiry") return -1;
          if (b.row.status === "inquiry") return 1;
          return b.row.created_at.localeCompare(a.row.created_at);
        })
      : stale
      ? // When the stale chip is active, the operator's mental model is "show
        // me the most urgent first" → oldest first wins over score. Score
        // overrides this if the user picked it explicitly.
        [...projectsWithScore].sort((a, b) =>
          a.row.created_at.localeCompare(b.row.created_at)
        )
      : projectsWithScore;

  // Tier counts: only across visible inquiry rows. Skip when zero.
  const tierCounts = projectsWithScore.reduce(
    (acc, p) => {
      if (p.leadTier) acc[p.leadTier] = (acc[p.leadTier] ?? 0) + 1;
      return acc;
    },
    { hot: 0, warm: 0, cold: 0 } as Record<"hot" | "warm" | "cold", number>
  );

  const counts: Record<string, number> = { all: 0 };
  for (const p of projects) counts[p.row.status] = (counts[p.row.status] ?? 0) + 1;
  counts.all = projects.length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <Inbox className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            클라이언트 문의 + 진행 중 프로젝트 통합 보기
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <a
              href="/api/admin/exports/inquiries?stale=1"
              download
              className="inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 border border-red-500/40 hover:border-red-400 rounded-md px-2.5 py-1.5"
              title="24h+ 지연 문의만 CSV"
            >
              <Download className="w-3 h-3" />
              Stale CSV
            </a>
          )}
          <a
            href="/api/admin/exports/projects"
            download
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-md px-2.5 py-1.5"
            title="모든 프로젝트 CSV 다운로드"
          >
            <Download className="w-3 h-3" />
            CSV
          </a>
        </div>
      </header>

      <div className="mb-3">
        <InboxBulkBar projectIds={projects.map((p) => p.row.id)} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <nav className="flex flex-wrap gap-1 text-xs">
          {[
            { value: "all", label: "전체" },
            { value: "inquiry", label: "문의" },
            { value: "in_progress", label: "제작 중" },
            { value: "review", label: "검토" },
            { value: "delivered", label: "완료" },
          ].map((tab) => {
            const active = !stale && (status ?? "all") === tab.value;
            const params = new URLSearchParams();
            if (tab.value !== "all") params.set("status", tab.value);
            if (q) params.set("q", q);
            if (source) params.set("source", source);
            if (sort) params.set("sort", sort);
            const qs = params.toString();
            const href = qs ? `/admin/inbox?${qs}` : "/admin/inbox";
            return (
              <Link
                key={tab.value}
                href={href}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  active
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 opacity-60">
                  {counts[tab.value] ?? 0}
                </span>
              </Link>
            );
          })}
          {/* Stale = 24h+ unanswered inquiries. SLA breach view. */}
          {(() => {
            const params = new URLSearchParams();
            params.set("stale", "1");
            if (q) params.set("q", q);
            if (source) params.set("source", source);
            if (sort) params.set("sort", sort);
            const href = `/admin/inbox?${params.toString()}`;
            return (
              <Link
                href={href}
                className={`ml-1 px-3 py-1.5 rounded-md border transition-colors inline-flex items-center gap-1 ${
                  stale
                    ? "bg-red-500/20 text-red-200 border-red-500/50"
                    : "bg-transparent text-red-400 border-red-500/30 hover:border-red-400 hover:text-red-200"
                }`}
              >
                <Flame className="w-3 h-3" />
                24h+ Stale
                {staleCount > 0 && (
                  <span className="ml-1 opacity-90 tabular-nums">
                    {staleCount}
                  </span>
                )}
              </Link>
            );
          })()}
        </nav>
        <InboxSearch />
      </div>

      {(tierCounts.hot + tierCounts.warm + tierCounts.cold > 0 || true) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-zinc-500">Lead 분포:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-red-500/15 text-red-300 border-red-500/30">
            <Flame className="w-3 h-3" /> Hot {tierCounts.hot}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
            Warm {tierCounts.warm}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-zinc-700/30 text-zinc-400 border-zinc-700">
            Cold {tierCounts.cold}
          </span>
          <span className="ml-2 text-zinc-500">정렬:</span>
          {(() => {
            const options = [
              { value: "recent", label: "최신순" },
              { value: "score", label: "스코어순" },
            ];
            return options.map((opt) => {
              const active = (sort ?? "recent") === opt.value;
              const params = new URLSearchParams();
              if (opt.value !== "recent") params.set("sort", opt.value);
              if (status && status !== "all") params.set("status", status);
              if (q) params.set("q", q);
              if (source) params.set("source", source);
              const qs = params.toString();
              const href = qs ? `/admin/inbox?${qs}` : "/admin/inbox";
              return (
                <Link
                  key={opt.value}
                  href={href}
                  className={`px-2 py-0.5 rounded border ${
                    active
                      ? "bg-zinc-100 text-black border-zinc-100"
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            });
          })()}
        </div>
      )}

      {sourceOptions.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-zinc-500 mr-1">출처:</span>
          {[{ value: "all", label: "전체" }, { value: "(direct)", label: "(direct)" }, ...sourceOptions.map((s) => ({ value: s, label: s }))].map((opt) => {
            const active = (source ?? "all") === opt.value;
            const isCharacter = opt.value === "character";
            const params = new URLSearchParams();
            if (opt.value !== "all") params.set("source", opt.value);
            if (status && status !== "all") params.set("status", status);
            if (q) params.set("q", q);
            if (sort) params.set("sort", sort);
            const qs = params.toString();
            const href = qs ? `/admin/inbox?${qs}` : "/admin/inbox";
            const baseClass = active
              ? isCharacter
                ? "bg-violet-500/30 text-violet-100 border-violet-400"
                : "bg-zinc-100 text-black border-zinc-100"
              : isCharacter
              ? "bg-transparent text-violet-300 border-violet-500/30 hover:border-violet-400 hover:text-violet-100"
              : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white";
            return (
              <Link
                key={opt.value}
                href={href}
                className={`px-2 py-1 rounded border transition-colors inline-flex items-center gap-1 ${baseClass}`}
                title={isCharacter ? "Character IP 페이지 경유 인콰이어 (utm_source=character)" : undefined}
              >
                {isCharacter && <Sparkles className="w-3 h-3" />}
                {opt.label}
              </Link>
            );
          })}
        </div>
      )}

      {!SUPABASE_CONFIGURED ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          Supabase 미설정 — Inbox 는 production 에서만 동작합니다.
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          해당 상태의 항목이 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
          {projects.map(({ row: p, leadTier, leadScore }) => (
            <div
              key={p.id}
              data-bulk-id={p.id}
              id={`project-${p.id}`}
              className="flex gap-4 p-4 hover:bg-zinc-900/40 transition-colors"
            >
              <div className="w-12 h-15 aspect-[4/5] relative rounded bg-zinc-900 overflow-hidden shrink-0">
                {p.model?.concept_image && (
                  <Image
                    src={p.model.concept_image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="font-medium truncate hover:underline"
                  >
                    {p.title}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.status === "inquiry" && (() => {
                      // SLA age chip: time since this inquiry was created.
                      // > 24h → red, > 8h → amber, otherwise zinc/silent.
                      // Lets the operator scan stale-leads at a glance.
                      const ageMs = Date.now() - new Date(p.created_at).getTime();
                      const ageH = ageMs / 3_600_000;
                      const label =
                        ageH < 1
                          ? `${Math.round(ageH * 60)}분`
                          : ageH < 24
                          ? `${Math.round(ageH)}h`
                          : `${Math.round(ageH / 24)}d`;
                      const tone =
                        ageH > 24
                          ? "bg-red-500/15 text-red-300 border-red-500/30"
                          : ageH > 8
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700";
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${tone}`}
                          title="응답 대기 시간"
                        >
                          {label}
                        </span>
                      );
                    })()}
                    {p.status === "inquiry" && leadTier && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${TIER_TONE[leadTier]}`}
                        title={`score ${leadScore}`}
                      >
                        {leadTier === "hot" && <Flame className="w-3 h-3" />}
                        {TIER_LABEL_KO[leadTier]}
                      </span>
                    )}
                    {p.utm_source === "character" && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-violet-500/15 text-violet-200 border-violet-500/30"
                        title={`Character IP 유입 — ${p.utm_campaign ?? "campaign 미상"}`}
                      >
                        <Sparkles className="w-3 h-3" />
                        Char
                      </span>
                    )}
                    {p.utm_source === "agent" && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-500/15 text-amber-200 border-amber-500/30"
                        title={`에이전트 referral — ${p.utm_campaign ?? "agent id 미상"} · 15% 커미션 attribution 대상`}
                      >
                        <Users className="w-3 h-3" />
                        Agent
                      </span>
                    )}
                    {p.utm_source === "pricing-calculator" && (() => {
                      // Surface the recommended path as a sub-label so the
                      // operator can read scope (license/paired/season/custom)
                      // at a glance without opening the row. parsePathFromCampaign
                      // guards against legacy/manual utm_campaign values that
                      // don't map to a known path.
                      const path = parsePathFromCampaign(p.utm_campaign);
                      const pathShort = path ? pathLabelForAdmin(path).short : null;
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-teal-500/15 text-teal-200 border-teal-500/30"
                          title={`가격 계산기 경유 — ${p.utm_campaign ?? "path 미상"}`}
                        >
                          <Calculator className="w-3 h-3" />
                          Calc
                          {pathShort && (
                            <span className="text-teal-300/80 normal-case tracking-normal text-[10px] ml-0.5">
                              · {pathShort}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                    {(() => {
                      // Surface blog-attributed inquiries with an emerald chip
                      // — mirrors the violet Char chip pattern. Tie-breaker:
                      // if utm_source is already "character", "agent", or
                      // "pricing-calculator", skip so the row doesn't carry
                      // two competing source chips.
                      if (
                        p.utm_source === "character" ||
                        p.utm_source === "agent" ||
                        p.utm_source === "pricing-calculator"
                      )
                        return null;
                      const blog = parseBlogReferrer(p.referrer);
                      if (!blog) return null;
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
                          title={`블로그 글 경유 — ${blog.locale.toUpperCase()}/${blog.slug}`}
                        >
                          <BookOpen className="w-3 h-3" />
                          Blog
                        </span>
                      );
                    })()}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                        STATUS_TONE[p.status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {p.model?.name ?? "모델 미선택"}
                  {p.client?.company && ` · ${p.client.company}`}
                  {p.client?.email && (
                    <a
                      href={`mailto:${p.client.email}`}
                      className="ml-1 text-zinc-400 hover:text-white"
                    >
                      {p.client.email}
                    </a>
                  )}
                  <span className="ml-2 text-zinc-600">
                    {new Date(p.created_at).toLocaleString("ko-KR", {
                      hour12: false,
                    })}
                  </span>
                </p>
                {p.brief && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 whitespace-pre-line">
                    {p.brief}
                  </p>
                )}
                {(p.utm_source || p.utm_campaign || p.referrer) && (
                  <p className="text-[10px] text-zinc-600 mt-1.5 truncate">
                    {p.utm_source && (
                      <>
                        <span className="text-zinc-500">출처</span> {p.utm_source}
                        {p.utm_medium && ` / ${p.utm_medium}`}
                        {p.utm_campaign && ` · ${p.utm_campaign}`}
                      </>
                    )}
                    {!p.utm_source && p.referrer && (
                      <>
                        <span className="text-zinc-500">referrer</span> {p.referrer.replace(/^https?:\/\//, "")}
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="shrink-0 self-center flex items-center gap-2">
                {p.status === "inquiry" && p.client?.email && (() => {
                  // Pre-fill reply with the brief snippet so admin doesn't
                  // have to bounce between tabs to remember context. URL-
                  // encode aggressively — mailto trips on raw \n, <, etc.
                  const subj = `[Virtual Agency] ${p.title} 회신`;
                  const briefSnippet = (p.brief ?? "").slice(0, 280);
                  const greeting = `안녕하세요${
                    p.client?.company ? `, ${p.client.company}` : ""
                  } 님.\n\nVirtual Agency 입니다. 보내주신 인콰이어리 잘 받았습니다.\n\n— 받은 브리프 ——\n${briefSnippet}\n———————————\n\n`;
                  const href = `mailto:${p.client.email}?subject=${encodeURIComponent(
                    subj
                  )}&body=${encodeURIComponent(greeting)}`;
                  return (
                    <a
                      href={href}
                      className="text-[11px] px-2.5 py-1.5 rounded-md border border-emerald-500/30 text-emerald-300 hover:border-emerald-400 hover:text-emerald-200"
                      title="회신 메일 (브리프 자동 prefill)"
                    >
                      ✉ 회신
                    </a>
                  );
                })()}
                {p.status === "inquiry" && (
                  <InquiryAcceptButton projectId={p.id} />
                )}
                <ProjectStatusSelect projectId={p.id} currentStatus={p.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
