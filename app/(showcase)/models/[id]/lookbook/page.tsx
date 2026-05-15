import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model, ModelFile } from "@/types";
import { INDUSTRY_LABELS, GENRE_LABELS, MOOD_LABELS } from "@/lib/tags";
import { ageInYears } from "@/lib/utils";
import { Printer } from "lucide-react";

export const metadata: Metadata = {
  title: "Lookbook — Virtual Agency",
  robots: { index: false }, // lookbook is a print/share view; main detail page is canonical
};

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchModelWithFiles(id: string): Promise<{
  model: Model | null;
  files: ModelFile[];
}> {
  if (!SUPABASE_CONFIGURED) {
    const dev = devModelStore.get(id);
    if (!dev || dev.status !== "active") return { model: null, files: [] };
    return { model: dev as Model, files: [] };
  }
  const supabase = await createClient();
  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();
  if (!model) return { model: null, files: [] };
  const { data: files } = await supabase
    .from("model_files")
    .select("*")
    .eq("model_id", id)
    .order("created_at", { ascending: false })
    .limit(8);
  return { model: model as Model, files: (files as ModelFile[]) ?? [] };
}

const KRW = new Intl.NumberFormat("ko-KR");

export default async function LookbookPage({ params }: PageProps) {
  const { id } = await params;
  const { model, files } = await fetchModelWithFiles(id);
  if (!model) notFound();

  const ageYears = ageInYears(model.debut_date);

  return (
    <div className="min-h-screen bg-white text-black print:bg-white">
      {/* Print/back controls — hidden on print */}
      <div className="print:hidden border-b border-zinc-200 px-8 py-3 flex items-center justify-between text-sm">
        <Link href={`/models/${model.id}`} className="text-zinc-500 hover:text-black">
          ← {model.name} 상세
        </Link>
        <PrintButton />
      </div>

      <article className="max-w-[210mm] mx-auto px-10 py-10 print:px-0 print:py-0">
        {/* Cover */}
        <header className="mb-8 pb-6 border-b border-zinc-300">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            Virtual Agency · Lookbook
          </p>
          <h1 className="text-5xl font-bold tracking-tight mt-2">{model.name}</h1>
          {ageYears !== null && (
            <p className="text-sm text-zinc-600 mt-1">
              생체나이 {ageYears}세 ·{" "}
              {model.debut_date
                ? `데뷔 ${new Date(model.debut_date).getFullYear()}`
                : ""}
            </p>
          )}
        </header>

        {/* Hero image */}
        {model.concept_image && (
          <div className="aspect-[3/4] relative bg-zinc-100 rounded-md overflow-hidden mb-6">
            <Image
              src={model.concept_image}
              alt={model.name}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        )}

        {/* Bio + key facts */}
        <section className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Profile
            </p>
            <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-line">
              {model.bio ?? "—"}
            </p>
            {model.personality && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-4 mb-1">
                  Personality
                </p>
                <p className="text-sm text-zinc-700">{model.personality}</p>
              </>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <Fact label="기본 단가">
              {model.base_price ? `₩${KRW.format(model.base_price)} / 일` : "문의"}
            </Fact>
            <Fact label="독점 단가">
              {model.exclusive_price
                ? `₩${KRW.format(model.exclusive_price)} / 일`
                : "—"}
            </Fact>
            <Fact label="독점 가능">
              {model.is_exclusive_available ? "가능" : "불가"}
            </Fact>
            <Fact label="팔로워">
              {(model.follower_count ?? 0).toLocaleString()}
            </Fact>
            {model.instagram_handle && (
              <Fact label="Instagram">@{model.instagram_handle}</Fact>
            )}
          </div>
        </section>

        {/* Tags */}
        <section className="grid grid-cols-3 gap-6 mb-8 text-xs">
          <TagRow
            label="산업"
            tags={model.industry_tags}
            labels={INDUSTRY_LABELS}
          />
          <TagRow label="장르" tags={model.genre_tags} labels={GENRE_LABELS} />
          <TagRow label="분위기" tags={model.mood_tags} labels={MOOD_LABELS} />
        </section>

        {/* Portfolio gallery */}
        {files.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
              Portfolio
            </p>
            <div className="grid grid-cols-4 gap-2">
              {files.slice(0, 8).map((f) => (
                <div
                  key={f.id}
                  className="aspect-[3/4] relative bg-zinc-100 rounded overflow-hidden"
                >
                  <Image
                    src={f.url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 pt-6 border-t border-zinc-300 flex items-baseline justify-between text-[10px] text-zinc-500">
          <span>Virtual Agency · 문의: virtualagency@example.com</span>
          <span>{new Date().toLocaleDateString("ko-KR")}</span>
        </footer>
      </article>

      <style>{`
        @media print {
          .print\\:hidden { display: none; }
          @page { margin: 12mm; size: A4; }
          article { box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="font-medium mt-0.5">{children}</p>
    </div>
  );
}

function TagRow({
  label,
  tags,
  labels,
}: {
  label: string;
  tags: string[] | null | undefined;
  labels: Record<string, string>;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </p>
      {!tags || tags.length === 0 ? (
        <p className="text-zinc-400">—</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <li
              key={t}
              className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px]"
            >
              {labels[t] ?? t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PrintButton() {
  return (
    <>
      <button
        type="button"
        data-print-trigger
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-black"
      >
        <Printer className="w-3.5 h-3.5" />
        인쇄·PDF 저장
      </button>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('[data-print-trigger]')?.addEventListener('click',function(){window.print();});`,
        }}
      />
    </>
  );
}
