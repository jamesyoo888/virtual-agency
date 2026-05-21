import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { toCSV, csvFilename } from "@/lib/csv";
import { loadModelPerformance } from "@/lib/analytics/model-performance";

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
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { kind } = await params;
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Unknown export kind" }, { status: 404 });
  }

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
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(kind)}"`,
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

  if (kind === "model-performance") {
    const report = await loadModelPerformance(30);
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
