import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { rankModels, type MatchBrief } from "@/lib/matching/score";
import { INDUSTRY_OPTIONS, GENRE_OPTIONS, MOOD_OPTIONS } from "@/lib/tags";
import ModelCard from "@/components/model-card";
import RfpFilterChips from "@/components/rfp-filter-chips";
import RfpPrintButton from "@/components/rfp-print-button";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "광고주 RFP — Virtual Agency",
  description: "캠페인 정보 한 페이지 RFP. 매칭 모델 + 라이선스 조건을 즉시 인쇄 가능.",
  // Print-friendly briefing pages don't need indexing.
  robots: { index: false, follow: false },
};

const CHANNEL_OPTIONS = [
  { value: "tvc", label: "TVC" },
  { value: "digital", label: "디지털/SNS" },
  { value: "ooh", label: "옥외/OOH" },
  { value: "print", label: "인쇄/지면" },
  { value: "lookbook", label: "룩북" },
  { value: "kv", label: "키 비주얼" },
];

const BUDGET_OPTIONS = [
  { value: "under_500", label: "500만원 미만" },
  { value: "500_1000", label: "500 ~ 1,000만원" },
  { value: "1000_3000", label: "1,000 ~ 3,000만원" },
  { value: "over_3000", label: "3,000만원 이상" },
];

interface PageProps {
  searchParams: Promise<{
    campaign?: string;
    advertiser?: string;
    launch?: string;
    duration_days?: string;
    channels?: string;
    message?: string;
    hero_copy?: string;
    industries?: string;
    moods?: string;
    target_age?: string;
    budget_band?: string;
    budget_per_day?: string;
    exclusive?: string;
  }>;
}

function parseCsv<T extends string>(raw: string | undefined, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
}

async function fetchActiveModels(): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter((m) => m.status === "active");
  }
  const supabase = await createClient();
  const { data } = await supabase.from("models").select("*").eq("status", "active");
  return (data as Model[]) ?? [];
}

export default async function RfpPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const campaign = sp.campaign ?? "";
  const advertiser = sp.advertiser ?? "";
  const launch = sp.launch ?? "";
  const duration = sp.duration_days ?? "";
  const channels = parseCsv(sp.channels, CHANNEL_OPTIONS.map((c) => c.value));
  const message = sp.message ?? "";
  const heroCopy = sp.hero_copy ?? "";
  const industries = parseCsv(sp.industries, INDUSTRY_OPTIONS.map((o) => o.value));
  const moods = parseCsv(sp.moods, MOOD_OPTIONS.map((o) => o.value));
  const targetAge = sp.target_age ?? "";
  const budgetBand = sp.budget_band ?? "";
  const budgetPerDay = sp.budget_per_day ? Number.parseInt(sp.budget_per_day, 10) : null;
  const needsExclusive = sp.exclusive === "true";

  const hasInput =
    campaign.length > 0 ||
    industries.length > 0 ||
    moods.length > 0 ||
    !!budgetPerDay;

  let recommended: { model: Model; score: number; reasons: string[] }[] = [];
  if (hasInput) {
    const brief: MatchBrief = {
      industries,
      genres: [], // RFPs don't carry genre directly — leave to mood/industry signal
      moods,
      budgetPerDay,
      needsExclusive,
      freeText: `${campaign} ${message} ${heroCopy}`,
    };
    const models = await fetchActiveModels();
    recommended = rankModels(models, brief).slice(0, 5);
  }

  const printPayload = {
    campaign, advertiser, launch, duration, channels, message, heroCopy,
    industries, moods, targetAge, budgetBand, budgetPerDay, needsExclusive,
    recommended: recommended.map((r) => ({ id: r.model.id, name: r.model.name, score: Math.round(r.score) })),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between print:hidden">
        <Link href="/" className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300">
          Virtual Agency
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          카탈로그
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 print:py-4 print:max-w-none">
        <div className="flex items-start justify-between gap-4 mb-8 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-zinc-400" />
              <h1 className="text-2xl font-bold">광고주 RFP 템플릿</h1>
            </div>
            <p className="text-sm text-zinc-500">
              캠페인 정보를 입력하면 한 페이지 RFP + 추천 모델이 만들어집니다. 인쇄·PDF 저장으로 사내 공유.
            </p>
          </div>
          {hasInput && <RfpPrintButton />}
        </div>

        {/* Print-only header */}
        <div className="hidden print:block mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-1">Virtual Agency · Request for Proposal</p>
          <h1 className="text-2xl font-bold text-black">{campaign || "캠페인 — 미입력"}</h1>
          <p className="text-xs text-zinc-600 mt-1">
            {advertiser ? `${advertiser} · ` : ""}
            {launch ? `런칭 ${launch}` : ""}
            {duration ? ` · ${duration}일 운영` : ""}
          </p>
        </div>

        <form method="GET" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5 mb-8 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="캠페인명" name="campaign" defaultValue={campaign} placeholder="2026 FW 뷰티 캠페인" />
            <Field label="광고주 / 대행사" name="advertiser" defaultValue={advertiser} placeholder="ACME / 한솔 DDB" />
            <Field label="런칭일" name="launch" type="date" defaultValue={launch} />
            <Field label="운영 기간 (일)" name="duration_days" type="number" defaultValue={duration} placeholder="14" />
          </div>

          <ChipsField name="channels" label="매체" selected={channels} options={CHANNEL_OPTIONS} />

          <Textarea name="message" label="핵심 메시지" defaultValue={message} rows={2}
            placeholder="브랜드가 전달하려는 1문장 메시지" />
          <Textarea name="hero_copy" label="히어로 카피 (헤드)" defaultValue={heroCopy} rows={2}
            placeholder="비주얼과 함께 노출되는 헤드 카피" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChipsField name="industries" label="업종" selected={industries} options={INDUSTRY_OPTIONS} />
            <ChipsField name="moods" label="분위기" selected={moods} options={MOOD_OPTIONS} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="타깃 연령대" name="target_age" defaultValue={targetAge} placeholder="20~34 여성" />
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400">총 예산 밴드</label>
              <select name="budget_band" defaultValue={budgetBand}
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm">
                <option value="">선택</option>
                {BUDGET_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <Field label="모델 일 단가 상한 (₩)" name="budget_per_day" type="number"
              defaultValue={budgetPerDay ?? ""} placeholder="800000" />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="exclusive" value="true" defaultChecked={needsExclusive} className="accent-white" />
            카테고리 독점 가능한 모델만 추천
          </label>

          <button type="submit" className="w-full py-2.5 rounded-md bg-white text-black font-medium hover:bg-zinc-200 text-sm">
            RFP 생성 + 모델 추천
          </button>
        </form>

        {hasInput && (
          <>
            {/* Compact RFP summary table — same content for screen + print */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8 print:border-zinc-300 print:bg-white print:text-black">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4 print:text-zinc-700">RFP 요약</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <SummaryRow label="캠페인" value={campaign} />
                <SummaryRow label="광고주" value={advertiser} />
                <SummaryRow label="런칭일" value={launch} />
                <SummaryRow label="운영 기간" value={duration ? `${duration}일` : ""} />
                <SummaryRow label="매체" value={channels.map((c) =>
                  CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c).join(", ")} />
                <SummaryRow label="타깃 연령대" value={targetAge} />
                <SummaryRow label="총 예산 밴드" value={
                  BUDGET_OPTIONS.find((b) => b.value === budgetBand)?.label ?? ""
                } />
                <SummaryRow label="일 단가 상한" value={budgetPerDay ? `₩${budgetPerDay.toLocaleString()}` : ""} />
                <SummaryRow label="업종 키워드" value={industries.map((v) =>
                  INDUSTRY_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ")} />
                <SummaryRow label="분위기 키워드" value={moods.map((v) =>
                  MOOD_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ")} />
                <SummaryRow label="독점 라이선스" value={needsExclusive ? "요청" : "비독점 허용"} />
              </dl>

              {(message || heroCopy) && (
                <div className="mt-5 pt-5 border-t border-zinc-800 print:border-zinc-300 space-y-3">
                  {message && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">핵심 메시지</p>
                      <p className="text-sm whitespace-pre-wrap">{message}</p>
                    </div>
                  )}
                  {heroCopy && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">히어로 카피</p>
                      <p className="text-sm whitespace-pre-wrap">{heroCopy}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-4 print:text-zinc-700">추천 모델 (top {recommended.length})</h2>
              {recommended.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">
                  조건에 맞는 모델이 없습니다. 업종·분위기·예산 조건을 완화해 보세요.
                </div>
              ) : (
                <div className="space-y-2 print:space-y-1">
                  {recommended.map((r, idx) => (
                    <article key={r.model.id}
                      className="flex items-stretch gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 print:border-zinc-300 print:bg-white print:text-black print:break-inside-avoid">
                      <div className="w-16 shrink-0 print:w-14">
                        <ModelCard model={r.model} variant="showcase" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="text-xs text-zinc-500 tabular-nums print:text-zinc-600">#{idx + 1}</span>
                            <Link href={`/models/${r.model.id}`}
                              className="font-semibold truncate hover:text-zinc-300 print:hover:text-black">
                              {r.model.name}
                            </Link>
                          </div>
                          <div className="flex items-baseline gap-1 shrink-0">
                            <span className="text-[10px] text-zinc-500">match</span>
                            <span className="text-lg font-bold tabular-nums">{Math.round(r.score)}</span>
                          </div>
                        </div>
                        {r.reasons.length > 0 && (
                          <p className="text-xs text-zinc-400 line-clamp-2 print:text-zinc-700">
                            {r.reasons.join(" · ")}
                          </p>
                        )}
                        {(r.model.base_price || r.model.exclusive_price) && (
                          <p className="text-xs text-zinc-500 print:text-zinc-700">
                            {r.model.base_price && (
                              <>일 단가 ₩{r.model.base_price.toLocaleString()}</>
                            )}
                            {r.model.exclusive_price && (
                              <> · 독점 ₩{r.model.exclusive_price.toLocaleString()}</>
                            )}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Footer note for the print copy */}
            <p className="text-xs text-zinc-500 print:text-zinc-600">
              본 RFP 는 virtual-agency-murex.vercel.app 의 매칭 알고리즘으로 자동 작성되었습니다.
              계약·라이선스 조건은 각 모델 상세 페이지를 참고하세요.
            </p>
          </>
        )}
      </main>

      {/* Print stylesheet — A4 friendly */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          html, body { background: white !important; color: black !important; }
        }
      `}</style>

      <RfpFilterChips />
      <script
        type="application/json"
        id="rfp-payload"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(printPayload) }}
      />
    </div>
  );
}

function Field({
  label, name, defaultValue, placeholder, type = "text",
}: {
  label: string; name: string;
  defaultValue?: string | number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
      />
    </div>
  );
}

function Textarea({
  label, name, defaultValue, placeholder, rows = 3,
}: {
  label: string; name: string;
  defaultValue?: string; placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
      />
    </div>
  );
}

function ChipsField<T extends string>({
  name, label, selected, options,
}: {
  name: string;
  label: string;
  selected: T[];
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">{label}</label>
      <input type="hidden" name={name} defaultValue={selected.join(",")} data-rfp-chips-target />
      <div className="flex flex-wrap gap-1.5" data-rfp-chips={name}>
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              data-rfp-chip-name={name}
              data-rfp-chip-value={o.value}
              data-rfp-chip-active={active}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
      <dt className="text-xs uppercase tracking-wider text-zinc-500 print:text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-200 print:text-black">{value || "—"}</dd>
    </div>
  );
}
