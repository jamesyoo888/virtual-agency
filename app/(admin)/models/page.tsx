import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Model } from "@/types";
import ModelCard from "@/components/model-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminModelsPage() {
  const supabase = await createClient();
  const { data: models } = await supabase
    .from("models")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Model Studio</h1>
          <p className="text-zinc-400 mt-1">버추얼 모델 관리</p>
        </div>
        <Link href="/admin/models/new">
          <Button className="bg-white text-black hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" />
            New Model
          </Button>
        </Link>
      </div>

      {!models || models.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-lg">아직 등록된 모델이 없습니다.</p>
          <p className="text-sm mt-2">New Model 버튼을 눌러 첫 모델을 생성하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {(models as Model[]).map((model) => (
            <ModelCard key={model.id} model={model} variant="admin" />
          ))}
        </div>
      )}
    </div>
  );
}
