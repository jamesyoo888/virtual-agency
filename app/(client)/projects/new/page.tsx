"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Model, ClientProduct } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

export default function NewProjectPage() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    model_id: "" as string,
    product_id: "" as string,
    brief: "",
  });

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: modelsData }, { data: userData }] = await Promise.all([
        supabase.from("models").select("*").eq("status", "active").order("name"),
        supabase.auth.getUser(),
      ]);
      if (modelsData) setModels(modelsData as Model[]);

      if (userData.user) {
        const { data: productsData } = await supabase
          .from("client_products")
          .select("*")
          .eq("client_id", userData.user.id)
          .order("name");
        if (productsData) setProducts(productsData as ClientProduct[]);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("projects").insert({
      client_id: user.id,
      title: form.title,
      model_id: form.model_id || null,
      product_id: form.product_id || null,
      brief: form.brief,
      status: "inquiry",
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push("/client/dashboard");
  }

  const selectedModel = models.find((m) => m.id === form.model_id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">새 프로젝트</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>프로젝트 제목 *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="bg-zinc-900 border-zinc-800"
            placeholder="예: 가을 시즌 뷰티 광고"
          />
        </div>

        <div className="space-y-2">
          <Label>모델 선택</Label>
          <Select
            value={form.model_id}
            onValueChange={(v) => setForm((f) => ({ ...f, model_id: v ?? "" }))}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="모델을 선택하세요" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedModel?.concept_image && (
            <div className="w-16 h-20 relative rounded overflow-hidden mt-2">
              <Image src={selectedModel.concept_image} alt={selectedModel.name} fill className="object-cover" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>상품 연결 (선택)</Label>
          <Select
            value={form.product_id}
            onValueChange={(v) => setForm((f) => ({ ...f, product_id: v ?? "" }))}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="상품을 선택하세요 (선택사항)" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="">없음</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>브리프</Label>
          <Textarea
            value={form.brief}
            onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
            className="bg-zinc-900 border-zinc-800"
            placeholder="원하는 이미지/영상의 방향, 분위기, 참고 레퍼런스 등을 자유롭게 적어주세요."
            rows={5}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <Button
            type="submit"
            className="bg-white text-black hover:bg-zinc-200"
            disabled={saving}
          >
            {saving ? "생성 중..." : "프로젝트 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
