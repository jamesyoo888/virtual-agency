import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { verifyQuoteToken } from "@/lib/quote/share-token";
import { buildQuotePdf } from "@/lib/pdf/quote";

export const runtime = "nodejs";
// Pretendard fetch on cold start can take 1–2s; embedding pdf-lib adds CPU.
// 30s is comfortable for both.
export const maxDuration = 30;

/**
 * PDF rendering of a project quote. Two authorization paths:
 *  1. Signed-in client whose `client_id` matches the project — RLS does the
 *     check naturally via `createClient()`.
 *  2. Anyone bearing a valid `?t=<token>` HMAC share token (same scheme as
 *     `/quote/share/[id]` HTML view). For this path we use the admin client
 *     because the visitor has no Supabase session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  type ProjectRow = {
    id: string;
    title: string;
    brief: string | null;
    status: string;
    invoice_amount: number | null;
    created_at: string;
    model?: { name: string | null; base_price: number | null; exclusive_price: number | null } | null;
  };

  let project: ProjectRow | null = null;

  if (token) {
    if (!verifyQuoteToken(id, token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const admin = await createAdminClient();
    const { data } = await admin
      .from("projects")
      .select(
        "id, title, brief, status, invoice_amount, created_at, model:models(name, base_price, exclusive_price)"
      )
      .eq("id", id)
      .single();
    project = (data as unknown as ProjectRow | null) ?? null;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const { data } = await supabase
      .from("projects")
      .select(
        "id, title, brief, status, invoice_amount, created_at, model:models(name, base_price, exclusive_price)"
      )
      .eq("id", id)
      .eq("client_id", user.id)
      .single();
    project = (data as unknown as ProjectRow | null) ?? null;
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const createdAt = new Date(project.created_at);
  const validUntil = new Date(createdAt);
  validUntil.setDate(validUntil.getDate() + 30);
  const amount =
    project.invoice_amount ?? project.model?.base_price ?? 0;

  try {
    const pdfBytes = await buildQuotePdf({
      projectId: project.id,
      projectTitle: project.title,
      brief: project.brief,
      modelName: project.model?.name ?? null,
      status: project.status,
      invoiceAmount: amount,
      createdAt,
      validUntil,
      exclusiveAvailable: project.model?.exclusive_price != null,
    });

    const filename = `quote-VA-${project.id.slice(0, 8).toUpperCase()}.pdf`;
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[quote-pdf] render failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render failed" },
      { status: 500 }
    );
  }
}
