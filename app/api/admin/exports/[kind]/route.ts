import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { toCSV, csvFilename } from "@/lib/csv";
import { loadModelPerformance } from "@/lib/analytics/model-performance";
import { loadForecast } from "@/lib/analytics/forecast";
import { wowFromRows } from "@/lib/analytics/week-over-week";
import { computeMtdRevenue } from "@/lib/analytics/mtd-revenue";

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
