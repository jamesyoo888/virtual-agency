import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import PrintButton from "@/components/print-button";
import QuoteShareButton from "@/components/quote-share-button";
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
  title: "견적서",
  robots: { index: false },
};

async function fetchProjectForQuote(
  id: string
): Promise<ProjectWithModel | null> {
  if (!SUPABASE_CONFIGURED) {
    // Dev demo: produce a synthetic quote so the page renders for screenshots
    // and design review without needing a seeded DB.
    const now = new Date().toISOString();
    return {
      id,
      client_id: "dev",
      model_id: null,
      product_id: null,
      title: "데모 캠페인",
      brief: "여름 한정 신제품 런칭 광고. 영상 1편 + 정지 이미지 5컷.",
      reference_images: [],
      status: "inquiry",
      invoice_amount: 5_000_000,
      created_at: now,
      updated_at: now,
      model: {
        name: "Demo Model",
        base_price: 5_000_000,
        exclusive_price: 25_000_000,
        concept_image: null,
      },
    } as unknown as ProjectWithModel;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("projects")
    .select(
      "*, model:models(name, base_price, exclusive_price, concept_image)"
    )
    .eq("id", id)
    .eq("client_id", user.id)
    .single();
  return (data as ProjectWithModel | null) ?? null;
}

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await fetchProjectForQuote(id);
  if (!project) notFound();

  const createdAt = new Date(project.created_at);
  const validUntil = new Date(createdAt);
  validUntil.setDate(validUntil.getDate() + 30);

  const subtotal = project.invoice_amount ?? project.model?.base_price ?? 0;
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return (
    <div className="min-h-screen bg-white text-zinc-900 print:bg-white">
      {/* Header — hidden on print */}
      <div className="print:hidden border-b border-zinc-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-50">
        <Link href="/client/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← 대시보드
        </Link>
        <div className="flex items-center gap-2">
          <QuoteShareButton projectId={project.id} />
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- needs real navigation for Content-Disposition download */}
          <a
            href={`/api/client/quote/${project.id}/pdf`}
            download
            className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
          >
            PDF
          </a>
          <PrintButton />
        </div>
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
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">발행</p>
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
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">프로젝트</p>
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
                <th className="text-right py-2 font-semibold w-40">금액 (KRW)</th>
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
                <td className="text-right tabular-nums">₩{KRW.format(subtotal)}</td>
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
          <p>· 본 견적은 표준 라이선스 기준이며, 사용 범위·기간에 따라 변경될 수 있습니다.</p>
        </section>

        <footer className="mt-16 pt-6 border-t border-zinc-200 text-center">
          <p className="text-xs text-zinc-500">Virtual Agency · AI Virtual Models</p>
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
