import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { toCSV, csvFilename } from "@/lib/csv";
import { loadModelPerformance } from "@/lib/analytics/model-performance";
import { loadForecast } from "@/lib/analytics/forecast";
import { wowFromRows } from "@/lib/analytics/week-over-week";
import { computeMtdRevenue } from "@/lib/analytics/mtd-revenue";
import { aggregateSearchRows } from "@/lib/analytics/search-log";
import {
  computeAtRiskClients,
  computeCohortRetention,
  cohortWindowMature,
  type ClientRetentionProjectRow,
} from "@/lib/analytics/client-retention";
import { loadPipelineVelocity } from "@/lib/analytics/pipeline-velocity";
import { loadStageTiming } from "@/lib/analytics/stage-timing";
import { loadCharacterAttribution } from "@/lib/analytics/character-attribution";
import { loadPricingCalculatorAttribution } from "@/lib/analytics/pricing-calculator-attribution";
import { loadBlogViews } from "@/lib/analytics/blog-views";
import { loadBlogAttribution } from "@/lib/analytics/blog-attribution";

/**
 * Admin-only CSV exports. Supports two kinds today:
 *   - `projects`   — every project row + the joined client/model display fields
 *   - `inquiries`  — projects filtered to status='inquiry' (handy for the
 *                    sales follow-up funnel)
 *
 * Streaming is not necessary at our scale (project counts are bounded by
 * hand-curation), so the handler builds the CSV in memory and returns it
 * with a proper Content-Disposition for browser download.
 */

const KINDS = new Set([
  "projects",
  "inquiries",
  "reviews",
  "experiments",
  "rfps",
  "bookmarks",
  "creators",
  "clients",
  "newsletter",
  "model-performance",
  "forecast",
  "wow",
  "trending",
  "mtd",
  "audit",
  "search",
  "client-retention",
  "at-risk-clients",
  "pipeline-velocity",
  "character-attribution",
  "blog-engagement",
  "blog-attribution",
  "pricing-calculator-attribution",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { kind } = await params;
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Unknown export kind" }, { status: 404 });
  }
  const url = new URL(request.url);
  const staleOnly = url.searchParams.get("stale") === "1";

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createAdminClient();

  if (kind === "projects" || kind === "inquiries") {
    let query = supabase
      .from("projects")
      .select(
        "id, title, brief, status, invoice_amount, created_at, updated_at, utm_source, utm_medium, utm_campaign, referrer, model:models(name), client:clients(email, company, name)"
      )
      .order("created_at", { ascending: false })
      .limit(5000);

    if (kind === "inquiries") query = query.eq("status", "inquiry");
    // /api/admin/exports/inquiries?stale=1 → only 24h+ untouched inquiries
    if (kind === "inquiries" && staleOnly) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("created_at", cutoff);
    }
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type ProjectExportRow = {
      id: string;
      title: string;
      brief: string | null;
      status: string;
      invoice_amount: number | null;
      created_at: string;
      updated_at: string;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      referrer: string | null;
      model?: { name: string | null } | { name: string | null }[] | null;
      client?:
        | { email: string | null; company: string | null; name: string | null }
        | { email: string | null; company: string | null; name: string | null }[]
        | null;
    };
    const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;

    // Days in pipeline: for inquiries we still want to see "how long has it
    // been sitting open" (now − created_at). For delivered/cancelled rows
    // updated_at is the terminal state, so (updated_at − created_at) reads
    // as the realized cycle time. Open intermediate statuses fall back to
    // updated_at as the last meaningful touch.
    const nowMs = Date.now();
    const daysBetween = (a: string, b: string): number => {
      const diff = new Date(b).getTime() - new Date(a).getTime();
      return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
    };

    const rows = ((data ?? []) as unknown as ProjectExportRow[]).map((p) => {
      const model = pickOne(p.model);
      const client = pickOne(p.client);
      const endIso =
        p.status === "inquiry" ? new Date(nowMs).toISOString() : p.updated_at;
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        model: model?.name ?? "",
        client_company: client?.company ?? "",
        client_name: client?.name ?? "",
        client_email: client?.email ?? "",
        invoice_amount: p.invoice_amount ?? "",
        utm_source: p.utm_source ?? "",
        utm_medium: p.utm_medium ?? "",
        utm_campaign: p.utm_campaign ?? "",
        referrer: p.referrer ?? "",
        days_in_pipeline: daysBetween(p.created_at, endIso),
        brief: p.brief ?? "",
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    const columns = [
      "id",
      "title",
      "status",
      "model",
      "client_company",
      "client_name",
      "client_email",
      "invoice_amount",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "referrer",
      "days_in_pipeline",
      "brief",
      "created_at",
      "updated_at",
    ] as const;

    const csv = toCSV(rows, columns);
    const downloadName =
      kind === "inquiries" && staleOnly
        ? csvFilename("inquiries-stale")
        : csvFilename(kind);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "rfps") {
    const { data, error } = await supabase
      .from("rfp_submissions")
      .select(
        "id, client_id, inputs, recommended, created_at, client:clients(email, company)"
      )
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type RfpRow = {
      id: string;
      client_id: string;
      inputs: Record<string, unknown>;
      recommended: { id: string; name: string; score: number }[];
      created_at: string;
      client?: { email: string | null; company: string | null } | { email: string | null; company: string | null }[] | null;
    };
    const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;

    const rows = ((data ?? []) as unknown as RfpRow[]).map((r) => {
      const client = pickOne(r.client);
      const inp = r.inputs as {
        campaign?: string;
        advertiser?: string;
        launch?: string;
        durationDays?: string;
        budgetPerDay?: number | null;
        budgetBand?: string;
        needsExclusive?: boolean;
        industries?: string[];
        moods?: string[];
        channels?: string[];
        targetAge?: string;
      };
      const top3 = (r.recommended ?? [])
        .slice(0, 3)
        .map((rec) => `${rec.name}(${rec.score})`)
        .join(", ");
      return {
        id: r.id,
        client_company: client?.company ?? "",
        client_email: client?.email ?? "",
        campaign: inp.campaign ?? "",
        advertiser: inp.advertiser ?? "",
        launch: inp.launch ?? "",
        duration_days: inp.durationDays ?? "",
        budget_per_day: inp.budgetPerDay ?? "",
        budget_band: inp.budgetBand ?? "",
        exclusive: inp.needsExclusive ? "yes" : "",
        industries: (inp.industries ?? []).join("|"),
        moods: (inp.moods ?? []).join("|"),
        channels: (inp.channels ?? []).join("|"),
        target_age: inp.targetAge ?? "",
        top_3_recommendations: top3,
        created_at: r.created_at,
      };
    });

    const columns = [
      "id",
      "client_company",
      "client_email",
      "campaign",
      "advertiser",
      "launch",
      "duration_days",
      "budget_per_day",
      "budget_band",
      "exclusive",
      "industries",
      "moods",
      "channels",
      "target_age",
      "top_3_recommendations",
      "created_at",
    ] as const;

    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("rfps")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "bookmarks") {
    const { data, error } = await supabase
      .from("model_bookmarks")
      .select(
        "id, created_at, client:clients(email, company), model:models(name, slug)"
      )
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type BookmarkRow = {
      id: string;
      created_at: string;
      client?: { email: string | null; company: string | null } | { email: string | null; company: string | null }[] | null;
      model?: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
    };
    const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;

    const rows = ((data ?? []) as unknown as BookmarkRow[]).map((r) => {
      const client = pickOne(r.client);
      const model = pickOne(r.model);
      return {
        id: r.id,
        client_company: client?.company ?? "",
        client_email: client?.email ?? "",
        model: model?.name ?? "",
        model_slug: model?.slug ?? "",
        created_at: r.created_at,
      };
    });

    const columns = [
      "id",
      "client_company",
      "client_email",
      "model",
      "model_slug",
      "created_at",
    ] as const;

    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("bookmarks")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "creators") {
    const { data, error } = await supabase
      .from("creator_applications")
      .select(
        "id, display_name, bio, portfolio_url, instagram_handle, notes, status, rejection_reason, created_at, reviewed_at, client:clients(email, company)"
      )
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type CreatorRow = {
      id: string;
      display_name: string;
      bio: string | null;
      portfolio_url: string | null;
      instagram_handle: string | null;
      notes: string | null;
      status: string;
      rejection_reason: string | null;
      created_at: string;
      reviewed_at: string | null;
      client?: { email: string | null; company: string | null } | { email: string | null; company: string | null }[] | null;
    };
    const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;

    const rows = ((data ?? []) as unknown as CreatorRow[]).map((r) => {
      const client = pickOne(r.client);
      return {
        id: r.id,
        display_name: r.display_name,
        status: r.status,
        client_email: client?.email ?? "",
        client_company: client?.company ?? "",
        portfolio_url: r.portfolio_url ?? "",
        instagram: r.instagram_handle ?? "",
        bio: r.bio ?? "",
        notes: r.notes ?? "",
        rejection_reason: r.rejection_reason ?? "",
        created_at: r.created_at,
        reviewed_at: r.reviewed_at ?? "",
      };
    });

    const columns = [
      "id",
      "display_name",
      "status",
      "client_email",
      "client_company",
      "portfolio_url",
      "instagram",
      "bio",
      "notes",
      "rejection_reason",
      "created_at",
      "reviewed_at",
    ] as const;

    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("creators")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "clients") {
    // Aggregate per-client lifetime stats inline. Numbers are small (one row
    // per registered client) so we hold projects in memory once and bucket
    // by client_id rather than running a per-client subquery.
    const [{ data: clientRows, error: cErr }, { data: projectRows, error: pErr }] =
      await Promise.all([
        supabase
          .from("clients")
          .select("id, email, name, company, role, created_at")
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("projects")
          .select("client_id, status, invoice_amount, created_at"),
      ]);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    type ClientRow = {
      id: string;
      email: string | null;
      name: string | null;
      company: string | null;
      role: string;
      created_at: string;
    };
    type ProjectAgg = {
      client_id: string | null;
      status: string;
      invoice_amount: number | null;
      created_at: string;
    };

    const agg = new Map<
      string,
      {
        projects: number;
        inquiries: number;
        delivered: number;
        revenue: number;
        lastActivityAt: string | null;
      }
    >();
    for (const p of ((projectRows ?? []) as ProjectAgg[])) {
      if (!p.client_id) continue;
      const cur = agg.get(p.client_id) ?? {
        projects: 0,
        inquiries: 0,
        delivered: 0,
        revenue: 0,
        lastActivityAt: null,
      };
      cur.projects += 1;
      if (p.status === "inquiry") cur.inquiries += 1;
      if (p.status === "delivered") {
        cur.delivered += 1;
        cur.revenue += p.invoice_amount ?? 0;
      }
      if (!cur.lastActivityAt || p.created_at > cur.lastActivityAt) {
        cur.lastActivityAt = p.created_at;
      }
      agg.set(p.client_id, cur);
    }

    const rows = ((clientRows ?? []) as ClientRow[]).map((c) => {
      const a = agg.get(c.id);
      return {
        id: c.id,
        email: c.email ?? "",
        name: c.name ?? "",
        company: c.company ?? "",
        role: c.role,
        projects: a?.projects ?? 0,
        inquiries: a?.inquiries ?? 0,
        delivered: a?.delivered ?? 0,
        revenue: a?.revenue ?? 0,
        last_activity_at: a?.lastActivityAt ?? "",
        created_at: c.created_at,
      };
    });

    const columns = [
      "id",
      "email",
      "name",
      "company",
      "role",
      "projects",
      "inquiries",
      "delivered",
      "revenue",
      "last_activity_at",
      "created_at",
    ] as const;

    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("clients")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "newsletter") {
    const { data, error } = await supabase
      .from("newsletter_signups")
      .select("id, email, source, utm_source, utm_medium, utm_campaign, unsubscribed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type NewsletterRow = {
      id: string;
      email: string;
      source: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      unsubscribed_at: string | null;
      created_at: string;
    };
    const rows = ((data ?? []) as NewsletterRow[]).map((r) => ({
      id: r.id,
      email: r.email,
      source: r.source ?? "",
      utm_source: r.utm_source ?? "",
      utm_medium: r.utm_medium ?? "",
      utm_campaign: r.utm_campaign ?? "",
      unsubscribed_at: r.unsubscribed_at ?? "",
      created_at: r.created_at,
    }));

    const columns = [
      "id",
      "email",
      "source",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "unsubscribed_at",
      "created_at",
    ] as const;

    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("newsletter")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "experiments") {
    const { data, error } = await supabase
      .from("experiment_events")
      .select("key, variant, kind, surface, created_at, viewer_cookie, user_id")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type ExpRow = {
      key: string;
      variant: string;
      kind: string;
      surface: string | null;
      created_at: string;
      viewer_cookie: string;
      user_id: string | null;
    };
    const rows = ((data ?? []) as ExpRow[]).map((r) => ({
      experiment: r.key,
      variant: r.variant,
      event: r.kind,
      surface: r.surface ?? "",
      // Truncate the cookie so the CSV doesn't expose the full visitor id
      // beyond what's useful for sanity-checking dedup — the prefix is
      // enough to recognize repeat events without enabling reverse-lookup.
      viewer_id_prefix: r.viewer_cookie.slice(0, 8),
      user_id: r.user_id ?? "",
      created_at: r.created_at,
    }));

    const columns = [
      "experiment",
      "variant",
      "event",
      "surface",
      "viewer_id_prefix",
      "user_id",
      "created_at",
    ] as const;

    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("experiments")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "forecast") {
    const r = await loadForecast();
    if (!r) {
      return NextResponse.json(
        { error: "forecast unavailable (Supabase not configured)" },
        { status: 503 }
      );
    }
    // Forecast CSV is a flat "metric, value" two-column layout — the report
    // is summary data, not a row list. Keeps it human-readable in Excel.
    const rows: { metric: string; value: string }[] = [
      { metric: "window_days", value: String(r.windowDays) },
      { metric: "pipeline_total_value", value: String(r.pipelineTotalValue) },
      ...Object.entries(r.pipelineByStage).map(([stage, b]) => ({
        metric: `pipeline_${stage}_count`,
        value: String(b.count),
      })),
      ...Object.entries(r.pipelineByStage).map(([stage, b]) => ({
        metric: `pipeline_${stage}_value`,
        value: String(b.value),
      })),
      { metric: "delivered_90d_count", value: String(r.delivered90dCount) },
      { metric: "delivered_90d_value", value: String(r.delivered90dValue) },
      { metric: "inquired_90d_count", value: String(r.inquired90dCount) },
      { metric: "close_rate", value: r.closeRate.toFixed(4) },
      {
        metric: "avg_deal_value",
        value: String(Math.round(r.avgDealValue)),
      },
      {
        metric: "scenario_conservative",
        value: String(r.scenarios.conservative),
      },
      { metric: "scenario_base", value: String(r.scenarios.base) },
      { metric: "scenario_optimistic", value: String(r.scenarios.optimistic) },
      { metric: "confidence", value: r.confidence },
      // Pipeline aging buckets — the "stuck deals" signal. Flatten as
      // `pipeline_aging_<label>__<count|value>` so the two-column layout
      // survives. Empty buckets still emit zeros to keep the schema stable
      // for downstream spreadsheets.
      ...r.pipelineAging.flatMap((b) => [
        {
          metric: `pipeline_aging_${b.label}_count`,
          value: String(b.count),
        },
        {
          metric: `pipeline_aging_${b.label}_value`,
          value: String(b.value),
        },
      ]),
      // Per-model rollup. Flattens to `pipeline_by_model_<id>__<count|value>`
      // so the existing two-column shape stays intact — Excel users can
      // sort/filter without unmerging columns. Order preserves the
      // value-desc ranking from summarizePipelineByModel.
      ...r.pipelineByModel.flatMap((m, i) => [
        {
          metric: `pipeline_by_model_${i + 1}_id`,
          value: m.model_id,
        },
        {
          metric: `pipeline_by_model_${i + 1}_name`,
          value: m.model_name,
        },
        {
          metric: `pipeline_by_model_${i + 1}_count`,
          value: String(m.count),
        },
        {
          metric: `pipeline_by_model_${i + 1}_value`,
          value: String(m.value),
        },
      ]),
      // Per-source rollup (delivered revenue + close rate per utm_source).
      // Index-prefixed to preserve the value-desc ordering and avoid hash-style
      // column ambiguity when "(direct)" or symbols are in the source label.
      ...r.revenueBySource.flatMap((s, i) => [
        { metric: `revenue_by_source_${i + 1}_source`, value: s.source },
        {
          metric: `revenue_by_source_${i + 1}_delivered`,
          value: String(s.delivered),
        },
        {
          metric: `revenue_by_source_${i + 1}_inquired`,
          value: String(s.inquired),
        },
        {
          metric: `revenue_by_source_${i + 1}_revenue`,
          value: String(s.revenue),
        },
        {
          metric: `revenue_by_source_${i + 1}_close_rate`,
          value: s.closeRate.toFixed(4),
        },
        {
          metric: `revenue_by_source_${i + 1}_share_pct`,
          value: (s.revenueShare * 100).toFixed(2),
        },
      ]),
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("forecast")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "model-performance") {
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [7, 30, 90].includes(w) ? w : 30;
    const report = await loadModelPerformance(windowDays);
    const rows = report.rows.map((r) => ({
      model_id: r.modelId,
      name: r.name,
      status: r.status,
      views_30d: r.views,
      inquiries_30d: r.inquiries,
      delivered_30d: r.delivered,
      inquiry_rate: r.inquiryRate.toFixed(4),
      close_rate: r.closeRate != null ? r.closeRate.toFixed(4) : "",
    }));
    const columns = [
      "model_id",
      "name",
      "status",
      "views_30d",
      "inquiries_30d",
      "delivered_30d",
      "inquiry_rate",
      "close_rate",
    ] as const;
    const csv = toCSV(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "model-performance"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "trending") {
    // Pull the same set as /api/trending (popularity view, view-count desc,
    // active models only). Larger limit for analysis — 100 covers the long
    // tail without flooding.
    const { data, error } = await supabase
      .from("models_with_popularity")
      .select(
        "id, name, status, base_price, view_count_30d, follower_count, industry_tags, mood_tags"
      )
      .eq("status", "active")
      .order("view_count_30d", { ascending: false })
      .gt("view_count_30d", 0)
      .limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    type Row = {
      id: string;
      name: string;
      status: string;
      base_price: number | null;
      view_count_30d: number;
      follower_count: number | null;
      industry_tags: string[] | null;
      mood_tags: string[] | null;
    };
    const rows = ((data ?? []) as Row[]).map((r, i) => ({
      rank: i + 1,
      model_id: r.id,
      name: r.name,
      base_price: r.base_price ?? "",
      view_count_30d: r.view_count_30d,
      follower_count: r.follower_count ?? "",
      industry_tags: (r.industry_tags ?? []).join("|"),
      mood_tags: (r.mood_tags ?? []).join("|"),
    }));
    const csv = toCSV(rows, [
      "rank",
      "model_id",
      "name",
      "base_price",
      "view_count_30d",
      "follower_count",
      "industry_tags",
      "mood_tags",
    ] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("trending")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "mtd") {
    // 60 days = current + prior calendar month for any day-of-year.
    const since60 = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data } = await supabase
      .from("projects")
      .select("updated_at, invoice_amount")
      .eq("status", "delivered")
      .gte("updated_at", since60)
      .limit(5000);
    const r = computeMtdRevenue(
      (data ?? []) as { updated_at: string; invoice_amount: number | null }[]
    );
    const rows = [
      { metric: "mtd_revenue", value: String(r.mtdRevenue) },
      { metric: "projected_month_end", value: String(r.projectedMonthEnd) },
      { metric: "prior_month_total", value: String(r.priorMonthTotal) },
      { metric: "days_elapsed", value: String(r.daysElapsed) },
      { metric: "days_in_month", value: String(r.daysInMonth) },
      {
        metric: "pace_vs_prior_pct",
        value:
          r.priorMonthTotal > 0
            ? ((r.projectedMonthEnd / r.priorMonthTotal) * 100).toFixed(2)
            : "",
      },
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("mtd")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "wow") {
    // 14d window covers both the current-week and previous-week buckets
    // wowFromRows expects.
    const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const [{ data: inqRows }, { data: delRows }] = await Promise.all([
      supabase
        .from("projects")
        .select("created_at")
        .gte("created_at", since14)
        .limit(5000),
      supabase
        .from("projects")
        .select("updated_at, invoice_amount")
        .eq("status", "delivered")
        .gte("updated_at", since14)
        .limit(5000),
    ]);
    const inquiriesWow = wowFromRows(
      (inqRows ?? []) as { created_at: string }[]
    );
    const deliveredWow = wowFromRows(
      (delRows ?? []) as { updated_at: string }[],
      { dateField: "updated_at" }
    );
    const revenueWow = wowFromRows(
      (delRows ?? []) as {
        updated_at: string;
        invoice_amount: number | null;
      }[],
      { dateField: "updated_at", weighted: true }
    );
    const fmtPct = (m: ReturnType<typeof wowFromRows>) =>
      m.pct === null ? "" : m.pct.toFixed(2);
    const rows = [
      { metric: "inquiries_current", value: String(inquiriesWow.current) },
      { metric: "inquiries_previous", value: String(inquiriesWow.previous) },
      { metric: "inquiries_delta", value: String(inquiriesWow.delta) },
      { metric: "inquiries_pct", value: fmtPct(inquiriesWow) },
      { metric: "delivered_current", value: String(deliveredWow.current) },
      { metric: "delivered_previous", value: String(deliveredWow.previous) },
      { metric: "delivered_delta", value: String(deliveredWow.delta) },
      { metric: "delivered_pct", value: fmtPct(deliveredWow) },
      { metric: "revenue_current", value: String(revenueWow.current) },
      { metric: "revenue_previous", value: String(revenueWow.previous) },
      { metric: "revenue_delta", value: String(revenueWow.delta) },
      { metric: "revenue_pct", value: fmtPct(revenueWow) },
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("wow")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "audit") {
    // Same shape as /admin/audit-log: usage_log rows where route LIKE
    // 'audit.%'. We materialize the actor (email/company) here so the CSV is
    // self-contained — Excel users shouldn't need a join.
    const { data, error } = await supabase
      .from("usage_log")
      .select("id, route, user_id, metadata, created_at")
      .like("route", "audit.%")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    type AuditRow = {
      id: string;
      route: string;
      user_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    };
    const auditRows = (data ?? []) as AuditRow[];
    const userIds = Array.from(
      new Set(
        auditRows
          .map((r) => r.user_id)
          .filter((id): id is string => !!id)
      )
    );
    const actors = new Map<string, { email: string | null; company: string | null }>();
    if (userIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, email, company")
        .in("id", userIds);
      for (const c of (clients ?? []) as {
        id: string;
        email: string | null;
        company: string | null;
      }[]) {
        actors.set(c.id, { email: c.email, company: c.company });
      }
    }
    const rows = auditRows.map((r) => {
      const actor = r.user_id ? actors.get(r.user_id) : null;
      // Stringify metadata so the column stays a single CSV cell. Excel users
      // who need to drill in can paste into a JSON viewer.
      let metaJson = "";
      try {
        metaJson = r.metadata ? JSON.stringify(r.metadata) : "";
      } catch {
        metaJson = "[unserializable]";
      }
      return {
        id: r.id,
        event: r.route.replace(/^audit\./, ""),
        actor_email: actor?.email ?? "",
        actor_company: actor?.company ?? "",
        actor_id: r.user_id ?? "",
        metadata: metaJson,
        created_at: r.created_at,
      };
    });
    const csv = toCSV(rows, [
      "id",
      "event",
      "actor_email",
      "actor_company",
      "actor_id",
      "metadata",
      "created_at",
    ] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("audit")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "search") {
    // Aggregated top + zero-result queries for the requested window. Default
    // 30d matches the on-screen "콘텐츠 갭" view. Limit is intentionally
    // generous (200) so a spreadsheet can re-sort by zero-rate or count
    // without losing tail entries.
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [7, 30, 90].includes(w) ? w : 30;
    const since = new Date(
      Date.now() - windowDays * 86_400_000
    ).toISOString();
    const { data, error } = await supabase
      .from("usage_log")
      .select("metadata")
      .eq("route", "search.catalog")
      .gte("created_at", since)
      .limit(20000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    type LogRow = { metadata: { q?: string; results?: number } | null };
    const rows = ((data ?? []) as LogRow[]).map((r) => ({
      q: r.metadata?.q ?? "",
      results:
        typeof r.metadata?.results === "number" ? r.metadata.results : 0,
    }));
    const agg = aggregateSearchRows(rows, 200);
    // Merge top + zero into one set keyed by q, then write a "kind" column so
    // spreadsheet users can filter top-vs-gap without two files.
    const merged = new Map<
      string,
      {
        q: string;
        count: number;
        zero_result_count: number;
        avg_results: number;
        zero_rate_pct: string;
        flag: string;
      }
    >();
    for (const a of agg.top) {
      merged.set(a.q, {
        q: a.q,
        count: a.count,
        zero_result_count: a.zeroResultCount,
        avg_results: a.avgResults,
        zero_rate_pct:
          a.count > 0
            ? ((a.zeroResultCount / a.count) * 100).toFixed(1)
            : "",
        flag: "top",
      });
    }
    for (const a of agg.zero) {
      const cur = merged.get(a.q);
      if (cur) {
        cur.flag = "top+gap";
      } else {
        merged.set(a.q, {
          q: a.q,
          count: a.count,
          zero_result_count: a.zeroResultCount,
          avg_results: a.avgResults,
          zero_rate_pct:
            a.count > 0
              ? ((a.zeroResultCount / a.count) * 100).toFixed(1)
              : "",
          flag: "gap",
        });
      }
    }
    const csvRows = Array.from(merged.values()).sort(
      (a, b) => b.count - a.count
    );
    const csv = toCSV(csvRows, [
      "q",
      "count",
      "avg_results",
      "zero_result_count",
      "zero_rate_pct",
      "flag",
    ] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("search")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "at-risk-clients") {
    // Materialize the at-risk list for offline outreach. Pulls the same 18mo
    // delivered window the cohort export uses but joins client meta so the
    // CSV is self-contained (company / email / role) — operator can paste
    // this straight into a mail-merge tool.
    const since18mo = new Date(
      Date.now() - 18 * 30 * 86_400_000
    ).toISOString();
    const { data, error } = await supabase
      .from("projects")
      .select(
        "client_id, invoice_amount, updated_at, client:clients(company, email)"
      )
      .eq("status", "delivered")
      .gte("updated_at", since18mo)
      .limit(10_000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    type Row = {
      client_id: string | null;
      invoice_amount: number | null;
      updated_at: string;
      client?:
        | { company: string | null; email: string | null }
        | { company: string | null; email: string | null }[]
        | null;
    };
    const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;
    const rows: ClientRetentionProjectRow[] = ((data ?? []) as Row[]).map(
      (r) => ({
        client_id: r.client_id,
        invoice_amount: r.invoice_amount,
        delivered_at: r.updated_at,
        client: pickOne(r.client),
      })
    );
    // 100-row cap for CSV — covers any realistic outreach campaign without
    // exposing tail noise; UI variant uses 20.
    const list = computeAtRiskClients(rows, {
      minDelivered: 2,
      silentDays: 60,
      limit: 100,
    });
    const csvRows = list.map((c) => ({
      client_id: c.id,
      company: c.company,
      email: c.email ?? "",
      delivered_count: String(c.deliveredCount),
      lifetime_revenue_krw: String(c.totalRevenue),
      last_delivered_at: c.lastDeliveredAt,
      days_silent: String(c.daysSilent),
    }));
    const csv = toCSV(csvRows, [
      "client_id",
      "company",
      "email",
      "delivered_count",
      "lifetime_revenue_krw",
      "last_delivered_at",
      "days_silent",
    ] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "at-risk-clients"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "client-retention") {
    // Cohort table over the trailing N months. We pull a generous 18-month
    // window so the helper has enough history to detect repeat deliveries
    // for the oldest cohort it will report on (default = last 6 months,
    // each cohort needs +180d of trailing data for the longest window).
    const since18mo = new Date(
      Date.now() - 18 * 30 * 86_400_000
    ).toISOString();
    const { data, error } = await supabase
      .from("projects")
      .select("client_id, invoice_amount, updated_at")
      .eq("status", "delivered")
      .gte("updated_at", since18mo)
      .limit(10_000);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rows = ((data ?? []) as {
      client_id: string | null;
      invoice_amount: number | null;
      updated_at: string;
    }[]).map<ClientRetentionProjectRow>((r) => ({
      client_id: r.client_id,
      invoice_amount: r.invoice_amount,
      delivered_at: r.updated_at,
    }));
    const cohorts = computeCohortRetention(rows, { months: 12 });
    const csvRows = cohorts.map((c) => ({
      cohort_month: c.cohortMonth,
      cohort_size: c.size,
      repeat_60d_count: c.repeat60d,
      repeat_90d_count: c.repeat90d,
      repeat_180d_count: c.repeat180d,
      repeat_60d_pct:
        c.repeat60dRate !== null ? (c.repeat60dRate * 100).toFixed(2) : "",
      repeat_90d_pct:
        c.repeat90dRate !== null ? (c.repeat90dRate * 100).toFixed(2) : "",
      repeat_180d_pct:
        c.repeat180dRate !== null ? (c.repeat180dRate * 100).toFixed(2) : "",
      mature_60d: cohortWindowMature(c.cohortMonth, 60) ? "yes" : "no",
      mature_90d: cohortWindowMature(c.cohortMonth, 90) ? "yes" : "no",
      mature_180d: cohortWindowMature(c.cohortMonth, 180) ? "yes" : "no",
    }));
    const csv = toCSV(csvRows, [
      "cohort_month",
      "cohort_size",
      "repeat_60d_count",
      "repeat_60d_pct",
      "mature_60d",
      "repeat_90d_count",
      "repeat_90d_pct",
      "mature_90d",
      "repeat_180d_count",
      "repeat_180d_pct",
      "mature_180d",
    ] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "client-retention"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "character-attribution") {
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [7, 30, 90].includes(w) ? w : 30;
    const report = await loadCharacterAttribution(windowDays);
    const rows: { metric: string; value: string }[] = [
      { metric: "window_days", value: String(report.windowDays) },
      { metric: "total_inquiries", value: String(report.totalInquiries) },
      { metric: "total_delivered", value: String(report.totalDelivered) },
      { metric: "total_revenue_krw", value: String(report.totalRevenue) },
      { metric: "unknown_campaign", value: String(report.unknown) },
      ...report.bySlug.flatMap((c) => [
        { metric: `slug_${c.slug}_inquiries`, value: String(c.inquiries) },
        { metric: `slug_${c.slug}_delivered`, value: String(c.delivered) },
        { metric: `slug_${c.slug}_revenue_krw`, value: String(c.revenue) },
        { metric: `slug_${c.slug}_conversion_pct`, value: String(c.conversionPct) },
      ]),
      ...report.byTier.flatMap((t) => [
        { metric: `tier_${t.tier}_inquiries`, value: String(t.inquiries) },
        { metric: `tier_${t.tier}_delivered`, value: String(t.delivered) },
        { metric: `tier_${t.tier}_revenue_krw`, value: String(t.revenue) },
        { metric: `tier_${t.tier}_conversion_pct`, value: String(t.conversionPct) },
      ]),
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "character-attribution"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "pricing-calculator-attribution") {
    // Symmetric to character-attribution: aggregates inquiries / delivered /
    // revenue / conversion-% by recommended path (license_daily,
    // paired_editorial, season_anchor, custom_build, traditional_competitive).
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [7, 30, 90].includes(w) ? w : 30;
    const report = await loadPricingCalculatorAttribution(windowDays);
    const rows: { metric: string; value: string }[] = [
      { metric: "window_days", value: String(report.windowDays) },
      { metric: "total_inquiries", value: String(report.totalInquiries) },
      { metric: "total_delivered", value: String(report.totalDelivered) },
      { metric: "total_revenue_krw", value: String(report.totalRevenue) },
      { metric: "unknown_campaign", value: String(report.unknown) },
      ...report.byPath.flatMap((p) => [
        { metric: `path_${p.path}_inquiries`, value: String(p.inquiries) },
        { metric: `path_${p.path}_delivered`, value: String(p.delivered) },
        { metric: `path_${p.path}_revenue_krw`, value: String(p.revenue) },
        {
          metric: `path_${p.path}_conversion_pct`,
          value: String(p.conversionPct),
        },
      ]),
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "pricing-calculator-attribution"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "blog-attribution") {
    // Symmetric to character-attribution: aggregates inquiries / delivered /
    // revenue by the blog post each lead came from (parsed from the
    // referrer URL on the projects table). Two-column metric/value layout
    // so spreadsheet ops match the rest of the analytics exports.
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [7, 30, 90].includes(w) ? w : 90;
    const report = await loadBlogAttribution(windowDays);
    const rows: { metric: string; value: string }[] = [
      { metric: "window_days", value: String(report.windowDays) },
      { metric: "total_inquiries", value: String(report.totalInquiries) },
      { metric: "total_delivered", value: String(report.totalDelivered) },
      { metric: "total_revenue_krw", value: String(report.totalRevenue) },
      ...report.bySlug.flatMap((b) => [
        {
          metric: `${b.locale}_${b.slug}_inquiries`,
          value: String(b.inquiries),
        },
        {
          metric: `${b.locale}_${b.slug}_delivered`,
          value: String(b.delivered),
        },
        {
          metric: `${b.locale}_${b.slug}_revenue_krw`,
          value: String(b.revenue),
        },
        {
          metric: `${b.locale}_${b.slug}_conversion_pct`,
          value: String(b.conversionPct),
        },
      ]),
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "blog-attribution"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "blog-engagement") {
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [7, 30, 90].includes(w) ? w : 30;
    const report = await loadBlogViews(windowDays);
    type BlogRow = Record<string, unknown> & {
      slug: string;
      total: string;
      ko_views: string;
      en_views: string;
      kind: string;
    };
    const slugRows: BlogRow[] = report.bySlug.map((b) => ({
      slug: b.slug,
      total: String(b.total),
      ko_views: String(b.ko),
      en_views: String(b.en),
      kind: "post",
    }));
    const seriesRows: BlogRow[] = report.bySeries.map((s) => ({
      slug: s.seriesId,
      total: String(s.total),
      ko_views: "",
      en_views: "",
      kind: "series",
    }));
    const totalRow: BlogRow = {
      slug: "__total__",
      total: String(report.total),
      ko_views: String(report.totalKo),
      en_views: String(report.totalEn),
      kind: "summary",
    };
    const rows: BlogRow[] = [totalRow, ...seriesRows, ...slugRows];
    const csv = toCSV(rows, [
      "kind",
      "slug",
      "total",
      "ko_views",
      "en_views",
    ] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "blog-engagement"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "pipeline-velocity") {
    const w = Number.parseInt(url.searchParams.get("window") ?? "", 10);
    const windowDays = [30, 90, 180].includes(w) ? w : 90;
    const [v, stages] = await Promise.all([
      loadPipelineVelocity(windowDays),
      loadStageTiming(windowDays),
    ]);
    // Flat metric/value rows — same two-column layout used by forecast/mtd/wow
    // so the spreadsheet ops are consistent.
    const fmt = (d: number | null) => (d === null ? "" : d.toFixed(2));
    const rows: { metric: string; value: string }[] = [
      { metric: "window_days", value: String(v.windowDays) },
      { metric: "delivered_count", value: String(v.n) },
      { metric: "median_days", value: fmt(v.medianDays) },
      { metric: "p90_days", value: fmt(v.p90Days) },
      { metric: "fastest_days", value: fmt(v.fastestDays) },
      { metric: "slowest_days", value: fmt(v.slowestDays) },
      ...v.byMonth.flatMap((m) => [
        { metric: `month_${m.month}_count`, value: String(m.n) },
        { metric: `month_${m.month}_median_days`, value: fmt(m.medianDays) },
      ]),
      // Per-stage dwell — drilldown into where the lead time goes.
      { metric: "stage_measured_projects", value: String(stages.measuredProjects) },
      { metric: "stage_slowest", value: stages.slowestStage ?? "" },
      ...stages.buckets.flatMap((b) => [
        { metric: `stage_${b.stage}_count`, value: String(b.n) },
        { metric: `stage_${b.stage}_median_days`, value: fmt(b.medianDays) },
        { metric: `stage_${b.stage}_p90_days`, value: fmt(b.p90Days) },
        { metric: `stage_${b.stage}_share_pct`, value: (b.totalShare * 100).toFixed(2) },
      ]),
    ];
    const csv = toCSV(rows, ["metric", "value"] as const);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(
          "pipeline-velocity"
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // kind === "reviews"
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, status, rejection_reason, created_at, reviewed_at, model:models(name), client:clients(email, company), project:projects(title)"
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ReviewExportRow = {
    id: string;
    rating: number;
    comment: string | null;
    status: string;
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
    model?: { name: string | null } | { name: string | null }[] | null;
    client?:
      | { email: string | null; company: string | null }
      | { email: string | null; company: string | null }[]
      | null;
    project?: { title: string | null } | { title: string | null }[] | null;
  };
  const pickOneR = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const rows = ((data ?? []) as unknown as ReviewExportRow[]).map((r) => {
    const model = pickOneR(r.model);
    const client = pickOneR(r.client);
    const project = pickOneR(r.project);
    return {
      id: r.id,
      rating: r.rating,
      status: r.status,
      model: model?.name ?? "",
      project: project?.title ?? "",
      client_company: client?.company ?? "",
      client_email: client?.email ?? "",
      comment: r.comment ?? "",
      rejection_reason: r.rejection_reason ?? "",
      created_at: r.created_at,
      reviewed_at: r.reviewed_at ?? "",
    };
  });

  const columns = [
    "id",
    "rating",
    "status",
    "model",
    "project",
    "client_company",
    "client_email",
    "comment",
    "rejection_reason",
    "created_at",
    "reviewed_at",
  ] as const;

  const csv = toCSV(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("reviews")}"`,
      "Cache-Control": "no-store",
    },
  });
}
