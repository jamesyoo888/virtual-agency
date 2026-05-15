import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { toCSV, csvFilename } from "@/lib/csv";

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

const KINDS = new Set(["projects", "inquiries", "reviews"]);

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
        "id, title, brief, status, invoice_amount, created_at, updated_at, model:models(name), client:clients(email, company, name)"
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
      model?: { name: string | null } | { name: string | null }[] | null;
      client?:
        | { email: string | null; company: string | null; name: string | null }
        | { email: string | null; company: string | null; name: string | null }[]
        | null;
    };
    const pickOne = <T,>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? v[0] ?? null : v ?? null;

    const rows = ((data ?? []) as unknown as ProjectExportRow[]).map((p) => {
      const model = pickOne(p.model);
      const client = pickOne(p.client);
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        model: model?.name ?? "",
        client_company: client?.company ?? "",
        client_name: client?.name ?? "",
        client_email: client?.email ?? "",
        invoice_amount: p.invoice_amount ?? "",
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
