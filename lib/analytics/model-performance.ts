/**
 * Per-model conversion analytics — surfaces which models actually drive
 * inquiries vs. which just collect views. Pure aggregation kept in its own
 * function so the loader can be tested without standing up Supabase fixtures.
 *
 * The "score" here is intentionally simple — `inquiries / views` with a
 * smoothing prior so brand-new models aren't penalized for low denominators.
 * The prior assumes ~3% baseline catalog-wide CTR (a few inquiries per 100
 * views) which matches the early data; bump if that drifts.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface ModelPerformanceInput {
  modelId: string;
  name: string;
  status: string;
  conceptImage: string | null;
  views: number;
  inquiries: number;
  delivered: number;
}

export interface ModelPerformanceRow extends ModelPerformanceInput {
  /** Smoothed inquiry-per-view rate (0..1). */
  inquiryRate: number;
  /** Plain delivered/inquiries — null when no inquiries. */
  closeRate: number | null;
}

const PRIOR_VIEWS = 50;
const PRIOR_RATE = 0.03;

export function scoreModels(
  rows: ModelPerformanceInput[]
): ModelPerformanceRow[] {
  return rows
    .map((r) => {
      const inquiryRate =
        (r.inquiries + PRIOR_VIEWS * PRIOR_RATE) / (r.views + PRIOR_VIEWS);
      const closeRate = r.inquiries > 0 ? r.delivered / r.inquiries : null;
      return { ...r, inquiryRate, closeRate };
    })
    .sort((a, b) => b.inquiryRate - a.inquiryRate);
}

export interface ModelPerformanceReport {
  windowDays: number;
  totalViews: number;
  totalInquiries: number;
  totalDelivered: number;
  rows: ModelPerformanceRow[];
}

export async function loadModelPerformance(
  windowDays: number = 30
): Promise<ModelPerformanceReport> {
  const empty: ModelPerformanceReport = {
    windowDays,
    totalViews: 0,
    totalInquiries: 0,
    totalDelivered: 0,
    rows: [],
  };
  if (!SUPABASE_CONFIGURED) return empty;
  const supabase = await createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { data: modelRows },
    { data: viewRows },
    { data: projectRows },
  ] = await Promise.all([
    supabase
      .from("models")
      .select("id, name, status, concept_image")
      .limit(500),
    supabase
      .from("model_views")
      .select("model_id")
      .gte("created_at", since)
      .limit(50_000),
    supabase
      .from("projects")
      .select("model_id, status, created_at")
      .gte("created_at", since)
      .limit(5_000),
  ]);

  type ModelRow = {
    id: string;
    name: string;
    status: string;
    concept_image: string | null;
  };
  type ViewRow = { model_id: string };
  type ProjectRow = {
    model_id: string | null;
    status: string;
    created_at: string;
  };

  const models = (modelRows as ModelRow[] | null) ?? [];
  const viewsByModel = new Map<string, number>();
  for (const v of (viewRows as ViewRow[] | null) ?? []) {
    viewsByModel.set(v.model_id, (viewsByModel.get(v.model_id) ?? 0) + 1);
  }
  const inqByModel = new Map<string, number>();
  const dlvByModel = new Map<string, number>();
  for (const p of (projectRows as ProjectRow[] | null) ?? []) {
    if (!p.model_id) continue;
    inqByModel.set(p.model_id, (inqByModel.get(p.model_id) ?? 0) + 1);
    if (p.status === "delivered") {
      dlvByModel.set(p.model_id, (dlvByModel.get(p.model_id) ?? 0) + 1);
    }
  }

  const inputs: ModelPerformanceInput[] = models.map((m) => ({
    modelId: m.id,
    name: m.name,
    status: m.status,
    conceptImage: m.concept_image,
    views: viewsByModel.get(m.id) ?? 0,
    inquiries: inqByModel.get(m.id) ?? 0,
    delivered: dlvByModel.get(m.id) ?? 0,
  }));

  const rows = scoreModels(inputs);
  return {
    windowDays,
    totalViews: rows.reduce((s, r) => s + r.views, 0),
    totalInquiries: rows.reduce((s, r) => s + r.inquiries, 0),
    totalDelivered: rows.reduce((s, r) => s + r.delivered, 0),
    rows,
  };
}
