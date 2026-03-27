import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import InquiryForm from "@/components/inquiry-form";

const INDUSTRY_LABELS: Record<string, string> = {
  beauty: "뷰티", tech: "테크", food: "푸드",
  luxury: "럭셔리", sports: "스포츠", lifestyle: "라이프스타일",
};

const GENRE_LABELS: Record<string, string> = {
  ad: "광고", film: "영화", drama: "드라마", noir: "누아르",
  romance: "로맨스", "sci-fi": "SF", historical: "사극",
  indie: "독립영화", horror: "공포",
};

const MOOD_LABELS: Record<string, string> = {
  cold: "차가운", warm: "따뜻한", neutral: "중성적", edgy: "엣지있는",
};

export default async function ShowcaseModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!model) notFound();

  const m = model as Model;

  const debutDate = m.debut_date ? new Date(m.debut_date) : null;
  const ageYears = debutDate
    ? Math.floor((Date.now() - debutDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const { data: files } = await supabase
    .from("model_files")
    .select("*")
    .eq("model_id", id)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5">
        <a href="/" className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300">
          Virtual Agency
        </a>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 gap-12">
          {/* Left: main image */}
          <div>
            {m.concept_image ? (
              <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-zinc-900">
                <Image src={m.concept_image} alt={m.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="aspect-[3/4] rounded-2xl bg-zinc-900" />
            )}
          </div>

          {/* Right: info */}
          <div className="py-4">
            <h1 className="text-4xl font-bold mb-2">{m.name}</h1>

            {ageYears !== null && (
              <p className="text-zinc-400 mb-4">생체나이 {ageYears}세 · 데뷔 {debutDate?.getFullYear()}</p>
            )}

            <div className="flex items-center gap-4 mb-6 py-4 border-y border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">팔로워</p>
                <p className="font-semibold">{m.follower_count.toLocaleString()}</p>
              </div>
              {m.base_price && (
                <div>
                  <p className="text-xs text-zinc-500">기본 단가</p>
                  <p className="font-semibold">₩{m.base_price.toLocaleString()} / 일</p>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500">독점</p>
                <p className="font-semibold">{m.is_exclusive_available ? "가능" : "불가"}</p>
              </div>
            </div>

            {m.bio && (
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">{m.bio}</p>
            )}

            <div className="space-y-3 mb-8">
              {m.industry_tags.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">산업</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.industry_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                        {INDUSTRY_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {m.genre_tags.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">장르</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.genre_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                        {GENRE_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {m.mood_tags.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">분위기</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.mood_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs">
                        {MOOD_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <InquiryForm modelId={m.id} modelName={m.name} />
          </div>
        </div>

        {/* Portfolio grid */}
        {files && files.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold mb-6">Portfolio</h2>
            <div className="grid grid-cols-4 gap-3">
              {files.map((f) => (
                <div key={f.id} className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900">
                  <Image src={f.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
