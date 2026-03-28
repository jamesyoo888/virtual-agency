import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { devModelStore } from "@/lib/dev-store";
import { Model } from "@/types";
import ModelCard from "@/components/model-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

export const dynamic = "force-dynamic"; // always re-render to pick up new models

export default async function AdminModelsPage() {
  let models: Model[] = [];

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("models")
      .select("*")
      .order("created_at", { ascending: false });
    models = (data as Model[]) ?? [];
  } else {
    models = devModelStore.list() as Model[];
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Model Studio</h1>
          <p className="text-zinc-400 mt-1">버추얼 모델 관리 {!SUPABASE_CONFIGURED && <span className="text-xs text-yellow-500 ml-2">[dev 모드 — 서버 재시작 시 초기화]</span>}</p>
        </div>
        <Link href="/admin/models/new">
          <Button className="bg-white text-black hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" />
            New Model
          </Button>
        </Link>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-lg">아직 등록된 모델이 없습니다.</p>
          <p className="text-sm mt-2">New Model 버튼을 눌러 첫 모델을 생성하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} variant="admin" />
          ))}
        </div>
      )}
    </div>
  );
}
