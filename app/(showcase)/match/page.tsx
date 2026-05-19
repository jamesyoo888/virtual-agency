import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { rankModels, extractTagsFromText } from "@/lib/matching/score";
import { loadPersonaInquiries } from "@/lib/matching/persona";
import { INDUSTRY_OPTIONS, GENRE_OPTIONS, MOOD_OPTIONS } from "@/lib/tags";
import ModelCard from "@/components/model-card";
import ShareLinkButton from "@/components/share-link-button";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata = {
  title: "AI 모델 매칭 — Virtual Agency",
  description: "광고 컨셉을 입력하면 어울리는 버추얼 모델을 자동 추천합니다.",
};

interface PageProps {
  searchParams: Promise<{
    brief?: string;
    industries?: string;
    genres?: string;
    moods?: string;
    budget?: string;
    exclusive?: string;
  }>;
}

async function fetchActiveModels(): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter((m) => m.status === "active");
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select("*")
    .eq("status", "active");
  return (data as Model[]) ?? [];
}

function parseList<T extends string>(raw: string | undefined, allowed: T[]): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as string[]).includes(s));
}

export default async function MatchPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const brief = params.brief ?? "";
  const industries = parseList(
    params.industries,
    INDUSTRY_OPTIONS.map((o) => o.value)
  );
  const genres = parseList(params.genres, GENRE_OPTIONS.map((o) => o.value));
  const moods = parseList(params.moods, MOOD_OPTIONS.map((o) => o.value));
  const budgetPerDay = params.budget ? Number.parseInt(params.budget, 10) : null;
  const needsExclusive = params.exclusive === "true";

  // Augment explicit tags with anything parsed out of the freeform brief —
  // gives the user a "type a sentence" path that still scores meaningfully.
  const fromText = extractTagsFromText(brief);
  const hasInput =
    brief.length > 0 ||
    industries.length > 0 ||
    fromText.industries.length > 0 ||
    genres.length > 0 ||
    fromText.genres.length > 0 ||
    moods.length > 0 ||
    fromText.moods.length > 0 ||
    !!budgetPerDay ||
    needsExclusive;

  const [models, personaInquiries] = hasInput
    ? await Promise.all([fetchActiveModels(), loadPersonaInquiries()])
    : [[] as Model[], new Map<string, number>()];

  const mergedBrief = {
    industries: [...new Set([...industries, ...fromText.industries])],
    genres: [...new Set([...genres, ...fromText.genres])],
    moods: [...new Set([...moods, ...fromText.moods])],
    budgetPerDay,
    needsExclusive,
    freeText: brief,
    personaInquiries,
  };

  const ranked = hasInput ? rankModels(models, mergedBrief).slice(0, 12) : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300">
          Virtual Agency
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          카탈로그
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-zinc-400" />
          <h1 className="text-3xl font-bold">AI 모델 매칭</h1>
        </div>
        <p className="text-sm text-zinc-500 mb-8">
          광고 컨셉·산업·예산을 입력하면 어울리는 모델을 자동 추천합니다.
        </p>

        <form
          method="GET"
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5 mb-8"
        >
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400">
              광고 컨셉 (자유 입력)
            </label>
            <textarea
              name="brief"
              defaultValue={brief}
              rows={3}
              placeholder="예: 가을 시즌 럭셔리 뷰티 광고, 차갑고 세련된 분위기"
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <p className="text-[10px] text-zinc-600">
              산업·장르·분위기 키워드를 자동으로 인식합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FilterCheckboxes
              name="industries"
              label="산업"
              selected={industries}
              options={INDUSTRY_OPTIONS}
            />
            <FilterCheckboxes
              name="genres"
              label="장르"
              selected={genres}
              options={GENRE_OPTIONS}
            />
            <FilterCheckboxes
              name="moods"
              label="분위기"
              selected={moods}
              options={MOOD_OPTIONS}
            />
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400">
                예산 (₩/일)
              </label>
              <input
                type="number"
                name="budget"
                defaultValue={budgetPerDay ?? ""}
                placeholder="500000"
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                <input
                  type="checkbox"
                  name="exclusive"
                  value="true"
                  defaultChecked={needsExclusive}
                  className="accent-white"
                />
                독점 가능 모델만
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-white text-black font-medium hover:bg-zinc-200 text-sm"
          >
            매칭 시작
          </button>
        </form>

        {hasInput && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400">
                추천 결과 {ranked.length > 0 && `(${ranked.length})`}
              </h2>
              {ranked.length > 0 && <ShareLinkButton />}
            </div>
            {ranked.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
                조건에 맞는 모델을 찾지 못했습니다. 키워드를 줄여서 다시 시도해보세요.
              </div>
            ) : (
              <div className="space-y-3">
                {ranked.map((r) => (
                  <div
                    key={r.model.id}
                    className="flex items-stretch gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="w-24 shrink-0">
                      <ModelCard model={r.model} variant="showcase" />
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/models/${r.model.id}`}
                          className="font-semibold text-base hover:text-zinc-300"
                        >
                          {r.model.name}
                        </Link>
                        <div className="flex items-baseline gap-1 shrink-0">
                          <span className="text-xs text-zinc-500">매칭</span>
                          <span className="text-xl font-bold tabular-nums">
                            {Math.round(r.score)}
                          </span>
                        </div>
                      </div>
                      {r.reasons.length > 0 && (
                        <ul className="text-xs text-zinc-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {r.reasons.map((reason, i) => (
                            <li key={i}>• {reason}</li>
                          ))}
                        </ul>
                      )}
                      {r.model.bio && (
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-2">
                          {r.model.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function FilterCheckboxes<T extends string>({
  name,
  label,
  selected,
  options,
}: {
  name: string;
  label: string;
  selected: T[];
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input type="hidden" name={name} value={selected.join(",")} />
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              data-active={active}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
              data-name={name}
              data-value={o.value}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <noscript>
        <p className="text-[10px] text-zinc-600">
          체크박스는 JS 가 켜져있을 때 동작합니다. 자유 입력란을 활용하세요.
        </p>
      </noscript>
      {/* Tiny inline script wires button clicks to update the hidden input */}
      <FilterScript name={name} />
    </div>
  );
}

function FilterScript({ name }: { name: string }) {
  // server component renders a single dangerouslySetInnerHTML; we keep the
  // script scoped to data-name to avoid clobbering other groups.
  const code = `
    (function(){
      var nameAttr=${JSON.stringify(name)};
      var input=document.querySelector('input[type=hidden][name="'+nameAttr+'"]');
      if(!input) return;
      document.querySelectorAll('button[data-name="'+nameAttr+'"]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var values=(input.value||'').split(',').filter(Boolean);
          var v=btn.getAttribute('data-value');
          var i=values.indexOf(v);
          if(i>=0){ values.splice(i,1); btn.setAttribute('data-active','false'); btn.className=btn.className.replace('bg-white text-black border-white','bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'); }
          else { values.push(v); btn.setAttribute('data-active','true'); btn.className=btn.className.replace('bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500','bg-white text-black border-white'); }
          input.value=values.join(',');
        });
      });
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
