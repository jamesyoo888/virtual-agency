import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import type { Model } from "@/types";

async function getPopularModels(): Promise<
  Pick<Model, "id" | "name" | "concept_image">[]
> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("models")
      .select("id, name, concept_image")
      .eq("status", "active")
      .order("follower_count", { ascending: false })
      .limit(4);
    return (data as Pick<Model, "id" | "name" | "concept_image">[] | null) ?? [];
  } catch {
    return [];
  }
}

export default async function NotFound() {
  const popular = await getPopularModels();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="text-center max-w-md mb-12">
        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-3">
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          요청하신 페이지가 삭제되었거나 주소가 변경되었습니다.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            카탈로그로 돌아가기
          </Link>
          <Link
            href="/match"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            컨셉으로 매칭
          </Link>
        </div>
      </div>

      {popular.length > 0 && (
        <div className="w-full max-w-3xl">
          <p className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase mb-4 text-center">
            인기 모델
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popular.map((m) => (
              <Link
                key={m.id}
                href={`/models/${m.id}`}
                className="group block"
              >
                <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900 mb-2">
                  {m.concept_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.concept_image}
                      alt={m.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <p className="text-sm text-zinc-300 group-hover:text-white transition-colors text-center">
                  {m.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
