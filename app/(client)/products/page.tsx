"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientProduct } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("client_products")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProducts(data as ClientProduct[]);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("client_products")
      .insert({
        client_id: user.id,
        name: form.name,
        description: form.description,
        test_mode: true,
      })
      .select()
      .single();

    if (!error && data) {
      setProducts((prev) => [data as ClientProduct, ...prev]);
      setOpen(false);
      setForm({ name: "", description: "" });
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">상품 관리</h1>
          <p className="text-zinc-400 mt-1">광고에 사용할 상품을 등록합니다.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white text-black hover:bg-zinc-200 text-sm font-medium px-4 h-9"
          >
            <Plus className="w-4 h-4" />
            상품 등록
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>상품 등록</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>상품명</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="예: 수분크림 50ml"
                />
              </div>
              <div className="space-y-2">
                <Label>설명 (선택)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="상품 간단 설명..."
                  rows={3}
                />
              </div>
              <p className="text-xs text-zinc-500">
                테스트 모드로 등록됩니다. 정밀 3D화가 필요한 경우 상세 정보를 추후 입력하세요.
              </p>
              <Button
                type="submit"
                className="w-full bg-white text-black"
                disabled={saving}
              >
                {saving ? "등록 중..." : "등록"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 text-zinc-500 bg-zinc-900 rounded-xl">
          <Package className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          <p>등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900 rounded-xl p-5 space-y-2">
              <div className="flex items-start justify-between">
                <p className="font-medium">{p.name}</p>
                <Badge className={p.test_mode
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-green-500/20 text-green-400"
                }>
                  {p.test_mode ? "테스트" : "정밀"}
                </Badge>
              </div>
              {p.description && (
                <p className="text-sm text-zinc-400 line-clamp-2">{p.description}</p>
              )}
              <p className="text-xs text-zinc-600">
                {new Date(p.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
