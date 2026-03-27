"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Loader2, Check } from "lucide-react";

const INDUSTRY_OPTIONS = [
  { value: "beauty", label: "뷰티" }, { value: "tech", label: "테크" },
  { value: "food", label: "푸드" }, { value: "luxury", label: "럭셔리" },
  { value: "sports", label: "스포츠" }, { value: "lifestyle", label: "라이프스타일" },
];

const GENRE_OPTIONS = [
  { value: "ad", label: "광고" }, { value: "film", label: "영화" },
  { value: "drama", label: "드라마" }, { value: "noir", label: "누아르" },
  { value: "romance", label: "로맨스" }, { value: "sci-fi", label: "SF" },
  { value: "historical", label: "사극" }, { value: "indie", label: "독립영화" },
  { value: "horror", label: "공포" },
];

const MOOD_OPTIONS = [
  { value: "cold", label: "차가운" }, { value: "warm", label: "따뜻한" },
  { value: "neutral", label: "중성적" }, { value: "edgy", label: "엣지있는" },
];

export default function ModelWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    debut_date: "",
    bio: "",
    personality: "",
    instagram_handle: "",
    base_price: "",
    exclusive_price: "",
    is_exclusive_available: true,
    industry_tags: [] as string[],
    genre_tags: [] as string[],
    mood_tags: [] as string[],
  });

  const supabase = createClient();

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    const res = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, count: 4 }),
    });

    if (res.ok) {
      const { urls } = await res.json();
      setGeneratedImages(urls);
    } else {
      setError("이미지 생성에 실패했습니다. 다시 시도해주세요.");
    }
    setGenerating(false);
  }

  function toggleTag(type: "industry_tags" | "genre_tags" | "mood_tags", value: string) {
    setForm((f) => ({
      ...f,
      [type]: f[type].includes(value)
        ? f[type].filter((v) => v !== value)
        : [...f[type], value],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("모델명을 입력하세요.");
      return;
    }
    setSaving(true);
    setError(null);

    // Upload concept image to Supabase Storage if it's an external URL
    let conceptImage = selectedImage;

    if (selectedImage && selectedImage.startsWith("http") && !selectedImage.includes("supabase")) {
      try {
        const blob = await fetch(selectedImage).then((r) => r.blob());
        const ext = blob.type.split("/")[1] ?? "webp";
        const filename = `concepts/${Date.now()}.${ext}`;
        const { data: uploadData } = await supabase.storage
          .from("model-assets")
          .upload(filename, blob, { contentType: blob.type });
        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("model-assets")
            .getPublicUrl(filename);
          conceptImage = urlData.publicUrl;
        }
      } catch {
        // Keep original URL if upload fails
      }
    }

    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        concept_image: conceptImage,
        base_price: form.base_price ? parseInt(form.base_price) : null,
        exclusive_price: form.exclusive_price ? parseInt(form.exclusive_price) : null,
      }),
    });

    if (res.ok) {
      const model = await res.json();
      router.push(`/admin/models/${model.id}`);
    } else {
      const { error: msg } = await res.json();
      setError(msg ?? "저장에 실패했습니다.");
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium
              ${step >= s ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"}`}>
              {step > s ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            <span className={`text-sm ${step === s ? "text-white" : "text-zinc-500"}`}>
              {s === 1 ? "컨셉 이미지" : "캐릭터 정보"}
            </span>
            {s < 2 && <div className="w-8 h-px bg-zinc-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Concept Image */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>프롬프트</Label>
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-zinc-900 border-zinc-800 flex-1"
                placeholder="예: 20대 초반 한국인 여성, 세련된 느낌, 자연스러운 피부톤..."
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="bg-white text-black hover:bg-zinc-200 shrink-0"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : "생성"}
              </Button>
            </div>
          </div>

          {generatedImages.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-3">마음에 드는 이미지를 선택하세요.</p>
              <div className="grid grid-cols-4 gap-3">
                {generatedImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(url)}
                    className={`aspect-[3/4] relative rounded-lg overflow-hidden border-2 transition-all
                      ${selectedImage === url ? "border-white" : "border-transparent hover:border-zinc-500"}`}
                  >
                    <Image src={url} alt={`Concept ${i + 1}`} fill className="object-cover" />
                    {selectedImage === url && (
                      <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedImage}
              className="bg-white text-black hover:bg-zinc-200"
            >
              다음 →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Character Info */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>모델명 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
                placeholder="예: ARIA"
              />
            </div>
            <div className="space-y-2">
              <Label>데뷔일 (생년월일)</Label>
              <Input
                type="date"
                value={form.debut_date}
                onChange={(e) => setForm((f) => ({ ...f, debut_date: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label>기본 단가 (원/일)</Label>
              <Input
                type="number"
                value={form.base_price}
                onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label>독점 단가 (원/일)</Label>
              <Input
                type="number"
                value={form.exclusive_price}
                onChange={(e) => setForm((f) => ({ ...f, exclusive_price: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
                placeholder="2000000"
              />
            </div>
            <div className="space-y-2">
              <Label>인스타그램</Label>
              <Input
                value={form.instagram_handle}
                onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
                placeholder="@handle"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>바이오</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="bg-zinc-900 border-zinc-800"
              placeholder="모델 소개 및 세계관..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>성격/톤</Label>
            <Textarea
              value={form.personality}
              onChange={(e) => setForm((f) => ({ ...f, personality: e.target.value }))}
              className="bg-zinc-900 border-zinc-800"
              placeholder="차갑고 미스터리한 분위기, 럭셔리 브랜드 최적화..."
              rows={2}
            />
          </div>

          {/* Tags */}
          <TagSelector
            label="산업 태그"
            options={INDUSTRY_OPTIONS}
            selected={form.industry_tags}
            onToggle={(v) => toggleTag("industry_tags", v)}
          />
          <TagSelector
            label="장르 태그"
            options={GENRE_OPTIONS}
            selected={form.genre_tags}
            onToggle={(v) => toggleTag("genre_tags", v)}
          />
          <TagSelector
            label="분위기 태그"
            options={MOOD_OPTIONS}
            selected={form.mood_tags}
            onToggle={(v) => toggleTag("mood_tags", v)}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="text-zinc-400"
            >
              ← 이전
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "저장 중..." : "모델 생성"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TagSelector({
  label, options, selected, onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onToggle(opt.value)} type="button">
            <Badge
              className={
                selected.includes(opt.value)
                  ? "bg-white text-black cursor-pointer"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 cursor-pointer"
              }
            >
              {opt.label}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
