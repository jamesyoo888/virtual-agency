import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ageInYears } from "@/lib/utils";
import { INDUSTRY_LABELS, GENRE_LABELS, MOOD_LABELS } from "@/lib/tags";
import { ArrowLeft } from "lucide-react";
import PrintButton from "@/components/print-button";

export const metadata = {
  title: "Compare Models — Virtual Agency",
  description: "선택한 버추얼 모델을 한눈에 비교",
  robots: { index: false }, // dynamic comparison pages aren't meant to be indexed
};

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

async function fetchModels(ids: string[]): Promise<Model[]> {
  if (ids.length === 0) return [];

  if (!SUPABASE_CONFIGURED) {
    return ids
      .map((id) => devModelStore.get(id))
      .filter((m): m is NonNullable<typeof m> => !!m) as Model[];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select("*")
    .in("id", ids)
    .eq("status", "active");
  if (!data) return [];

  // Preserve URL order so the user sees them in the order they picked.
  const byId = new Map((data as Model[]).map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter((m): m is Model => !!m);
}

const KRW = new Intl.NumberFormat("ko-KR");

function fmtPrice(v: number | null | undefined): string {
  return v ? `₩${KRW.format(v)} / 일` : "—";
}

function joinLabels(
  tags: string[] | null | undefined,
  labels: Record<string, string>
): string {
  if (!tags || tags.length === 0) return "—";
  return tags.map((t) => labels[t] ?? t).join(", ");
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const models = await fetchModels(ids);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between print:hidden">
        <Link
          href="/"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
        <div className="flex items-center gap-3">
          {models.length > 0 && <PrintButton label="비교표 인쇄" />}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            카탈로그로
          </Link>
        </div>
      </header>

      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        @media print {
          html, body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
      <main className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-bold mb-2">모델 비교</h1>
        <p className="text-sm text-zinc-500 mb-8">
          최대 4명까지 한눈에 비교. URL 공유로 견적 협의 자료로 활용하세요.
        </p>

        {models.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
            <p className="text-zinc-500">
              비교할 모델이 없습니다. 카탈로그에서 카드의 비교 아이콘을 눌러 추가하세요.
            </p>
          </div>
        ) : (
          <>
            {models.some((m) => m.base_price) && (
              <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-[10px] tracking-widest uppercase text-zinc-500 mb-3">
                  기본 단가 비교 (KRW / 일)
                </p>
                <PriceBars models={models} />
              </div>
            )}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))`,
              }}
            >
            {models.map((m) => {
              const ageYears = ageInYears(m.debut_date);
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col"
                >
                  <Link
                    href={`/models/${m.id}`}
                    className="aspect-[3/4] relative bg-zinc-900 block group"
                  >
                    {m.concept_image ? (
                      <Image
                        src={m.concept_image}
                        alt={m.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-[1.02]"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
                        No image
                      </div>
                    )}
                    {m.is_exclusive_available && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-white/10 text-white border-white/20 text-[10px]">
                          독점가능
                        </Badge>
                      </div>
                    )}
                  </Link>

                  <div className="p-4 flex-1 space-y-3 text-sm">
                    <div>
                      <Link
                        href={`/models/${m.id}`}
                        className="font-semibold text-base hover:text-zinc-300"
                      >
                        {m.name}
                      </Link>
                      {ageYears !== null && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          생체나이 {ageYears}세
                        </p>
                      )}
                    </div>

                    <Row label="기본 단가" value={fmtPrice(m.base_price)} />
                    <Row label="독점 단가" value={fmtPrice(m.exclusive_price)} />
                    <Row
                      label="독점"
                      value={m.is_exclusive_available ? "가능" : "불가"}
                    />
                    <Row
                      label="팔로워"
                      value={(m.follower_count ?? 0).toLocaleString()}
                    />
                    <Row
                      label="산업"
                      value={joinLabels(m.industry_tags, INDUSTRY_LABELS)}
                    />
                    <Row
                      label="장르"
                      value={joinLabels(m.genre_tags, GENRE_LABELS)}
                    />
                    <Row
                      label="분위기"
                      value={joinLabels(m.mood_tags, MOOD_LABELS)}
                    />

                    {m.bio && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                          바이오
                        </p>
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-5">
                          {m.bio}
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/models/${m.id}`}
                      className="block mt-auto pt-3 text-center text-xs font-medium rounded-md bg-white text-black hover:bg-zinc-200 py-2 transition-colors"
                    >
                      상세 보기
                    </Link>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-zinc-200 text-xs mt-0.5">{value}</p>
    </div>
  );
}

function PriceBars({ models }: { models: Model[] }) {
  const max = Math.max(...models.map((m) => m.base_price ?? 0), 1);
  return (
    <div className="space-y-3">
      {models.map((m) => {
        const v = m.base_price ?? 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div key={m.id} className="grid grid-cols-[8rem_1fr_6rem] gap-3 items-center text-xs">
            <p className="truncate text-zinc-300">{m.name}</p>
            <div className="h-2.5 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-zinc-500 to-white transition-all"
                style={{ width: `${pct}%` }}
                aria-label={`${m.name} 가격 비율`}
              />
            </div>
            <p className="text-right tabular-nums text-zinc-200">
              {v ? `₩${KRW.format(v)}` : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
