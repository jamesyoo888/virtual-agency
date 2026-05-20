import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { verifyQuoteToken } from "@/lib/quote/share-token";
import PrintButton from "@/components/print-button";
import type { Project, Model } from "@/types";

const KRW = new Intl.NumberFormat("ko-KR");

const STATUS_LABELS: Record<string, string> = {
  inquiry: "문의 접수",
  brief_received: "브리프 접수",
  in_progress: "제작 중",
  review: "검토",
  delivered: "납품 완료",
};

type ProjectWithModel = Project & {
  model?: Pick<Model, "name" | "base_price" | "exclusive_price" | "concept_image">;
};

export const metadata = {
  title: "견적서 공유 — Virtual Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

async function loadProject(id: string): Promise<ProjectWithModel | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "*, model:models(name, base_price, exclusive_price, concept_image)"
    )
    .eq("id", id)
    .single();
  return (data as ProjectWithModel | null) ?? null;
}

export default async function SharedQuotePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { t } = await searchParams;

  if (!t || !verifyQuoteToken(id, t)) notFound();

  const project = await loadProject(id);
  if (!project) notFound();

  const createdAt = new Date(project.created_at);
  const validUntil = new Date(createdAt);
  validUntil.setDate(validUntil.getDate() + 30);

  const subtotal = project.invoice_amount ?? project.model?.base_price ?? 0;
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return (
    <div className="min-h-screen bg-white text-zinc-900 print:bg-white">
      <div className="print:hidden border-b border-zinc-200 px-6 py-4 flex items-center justify-between bg-zinc-50">
        <p className="text-xs text-zinc-500">공유된 견적서 (열람 전용)</p>
        <PrintButton />
      </div>

      <main className="max-w-3xl mx-auto p-8 md:p-12 print:p-8">
        <header className="flex items-start justify-between mb-12">
          <div>
            <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-2">
              Virtual Agency
            </p>
            <h1 className="text-3xl font-bold">견적서</h1>
            <p className="text-sm text-zinc-500 mt-1">Quotation</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-zinc-500">견적번호</p>
            <p className="font-mono text-zinc-900">
              VA-{project.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 mb-12 text-sm">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              발행
            </p>
            <p className="font-semibold">Virtual Agency</p>
            <p className="text-zinc-600">AI 버추얼 모델 에이전시</p>
            <p className="text-zinc-600 mt-1">
              발행일: {createdAt.toLocaleDateString("ko-KR")}
            </p>
            <p className="text-zinc-600">
              유효기간: {validUntil.toLocaleDateString("ko-KR")}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              프로젝트
            </p>
            <p className="font-semibold">{project.title}</p>
            <p className="text-zinc-600 mt-1">
              상태: {STATUS_LABELS[project.status] ?? project.status}
            </p>
            {project.model?.name && (
              <p className="text-zinc-600">모델: {project.model.name}</p>
            )}
          </div>
        </section>

        {project.brief && (
          <section className="mb-12">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              브리프
            </p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {project.brief}
            </p>
          </section>
        )}

        <section className="mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-900">
                <th className="text-left py-2 font-semibold">항목</th>
                <th className="text-right py-2 font-semibold w-40">
                  금액 (KRW)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-200">
                <td className="py-3">
                  <p className="font-medium">
                    {project.model?.name ?? "모델 사용료"}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {project.model?.exclusive_price
                      ? "독점 사용 가능"
                      : "비독점 기본 단가"}
                  </p>
                </td>
                <td className="text-right tabular-nums">
                  ₩{KRW.format(subtotal)}
                </td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="py-3 text-zinc-600">소계</td>
                <td className="text-right tabular-nums">
                  ₩{KRW.format(subtotal)}
                </td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="py-3 text-zinc-600">부가세 (10%)</td>
                <td className="text-right tabular-nums">₩{KRW.format(vat)}</td>
              </tr>
              <tr className="border-b-2 border-zinc-900">
                <td className="py-4 font-bold text-base">합계</td>
                <td className="text-right tabular-nums font-bold text-base">
                  ₩{KRW.format(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="text-xs text-zinc-500 leading-relaxed space-y-1">
          <p>· 상기 견적은 발행일로부터 30일간 유효합니다.</p>
          <p>· 결제 조건 및 납기는 별도 협의 후 확정됩니다.</p>
          <p>
            · 본 견적은 표준 라이선스 기준이며, 사용 범위·기간에 따라
            변경될 수 있습니다.
          </p>
        </section>

        <footer className="mt-16 pt-6 border-t border-zinc-200 text-center">
          <p className="text-xs text-zinc-500">
            Virtual Agency · AI Virtual Models · 본 링크는 열람 전용입니다.
          </p>
        </footer>
      </main>

      <style>{`
        @page { size: A4; margin: 18mm; }
        @media print {
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
