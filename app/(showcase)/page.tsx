import { createClient } from "@/lib/supabase/server";
import { Model } from "@/types";
import ModelCard from "@/components/model-card";
import CatalogFilters from "@/components/catalog-filters";

interface PageProps {
  searchParams: Promise<{
    industry?: string;
    genre?: string;
    mood?: string;
    price_max?: string;
    exclusive?: string;
  }>;
}

export const metadata = {
  title: "Virtual Agency — Model Catalog",
  description: "AI 기반 버추얼 모델 에이전시",
};

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("models")
    .select("*")
    .eq("status", "active")
    .order("follower_count", { ascending: false });

  if (params.industry) {
    query = query.contains("industry_tags", [params.industry]);
  }
  if (params.genre) {
    query = query.contains("genre_tags", [params.genre]);
  }
  if (params.mood) {
    query = query.contains("mood_tags", [params.mood]);
  }
  if (params.price_max) {
    query = query.lte("base_price", parseInt(params.price_max));
  }
  if (params.exclusive === "true") {
    query = query.eq("is_exclusive_available", true);
  }

  const { data: models } = await query;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-widest uppercase">
          Virtual Agency
        </h1>
        <nav className="flex gap-6 text-sm text-zinc-400">
          <a href="#" className="hover:text-white transition-colors">Models</a>
          <a href="#contact" className="hover:text-white transition-colors">문의</a>
        </nav>
      </header>

      {/* Hero */}
      <div className="px-8 py-16 border-b border-zinc-900">
        <h2 className="text-5xl font-bold tracking-tight mb-3">
          AI Virtual Models
        </h2>
        <p className="text-zinc-400 text-lg max-w-xl">
          실제보다 완벽한. 언제나 당신의 브랜드에 최적화된 버추얼 모델.
        </p>
      </div>

      <div className="flex">
        {/* Filters sidebar */}
        <aside className="w-64 shrink-0 p-6 border-r border-zinc-900 sticky top-0 h-screen overflow-auto">
          <CatalogFilters current={params} />
        </aside>

        {/* Grid */}
        <main className="flex-1 p-8">
          {!models || models.length === 0 ? (
            <div className="text-center py-24 text-zinc-500">
              <p>해당 조건의 모델이 없습니다.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500 mb-6">
                {models.length}명의 모델
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(models as Model[]).map((model) => (
                  <ModelCard key={model.id} model={model} variant="showcase" />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
