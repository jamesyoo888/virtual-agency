"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Edit, X, Check, Loader2 } from "lucide-react";

// ── constants ────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  { value: "beauty", label: "뷰티" },
  { value: "tech", label: "테크" },
  { value: "food", label: "푸드" },
  { value: "luxury", label: "럭셔리" },
  { value: "sports", label: "스포츠" },
  { value: "lifestyle", label: "라이프스타일" },
];
const MOOD_OPTIONS = [
  { value: "cold", label: "차가운" },
  { value: "warm", label: "따뜻한" },
  { value: "neutral", label: "중성적" },
  { value: "edgy", label: "엣지있는" },
];

const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  INDUSTRY_OPTIONS.map((o) => [o.value, o.label])
);
const MOOD_LABELS: Record<string, string> = Object.fromEntries(
  MOOD_OPTIONS.map((o) => [o.value, o.label])
);

// ── EditForm type ─────────────────────────────────────────────────────────────

interface EditForm {
  name: string;
  base_price: string;
  exclusive_price: string;
  bio: string;
  instagram_handle: string;
  is_exclusive_available: boolean;
  industry_tags: string[];
  mood_tags: string[];
}

function modelToForm(m: Model): EditForm {
  return {
    name: m.name ?? "",
    base_price: m.base_price != null ? String(m.base_price) : "",
    exclusive_price: m.exclusive_price != null ? String(m.exclusive_price) : "",
    bio: m.bio ?? "",
    instagram_handle: m.instagram_handle ?? "",
    is_exclusive_available: m.is_exclusive_available ?? false,
    industry_tags: m.industry_tags ?? [],
    mood_tags: m.mood_tags ?? [],
  };
}

// ── main component ────────────────────────────────────────────────────────────

export default function AdminModelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const [model, setModel] = useState<Model | null>(null);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // edit state
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── fetch model ─────────────────────────────────────────────────────────────

  const fetchModel = useCallback(async () => {
    try {
      const res = await fetch(`/api/models/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      // model_files may be nested when Supabase returns them
      const { model_files, ...modelData } = data;
      setModel(modelData as Model);
      if (model_files) setFiles(model_files);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  // ── redirect if not found ────────────────────────────────────────────────────

  useEffect(() => {
    if (notFound) router.replace("/admin/models");
  }, [notFound, router]);

  // ── edit helpers ─────────────────────────────────────────────────────────────

  function startEdit() {
    if (!model) return;
    setForm(modelToForm(model));
    setSaveError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setForm(null);
    setSaveError(null);
  }

  function toggleTag(type: "industry_tags" | "mood_tags", value: string) {
    if (!form) return;
    setForm((f) =>
      f
        ? {
            ...f,
            [type]: f[type].includes(value)
              ? f[type].filter((v) => v !== value)
              : [...f[type], value],
          }
        : f
    );
  }

  async function handleSave() {
    if (!form || !model) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: form.name.trim() || model.name,
        base_price: form.base_price !== "" ? Number(form.base_price) : null,
        exclusive_price:
          form.exclusive_price !== "" ? Number(form.exclusive_price) : null,
        bio: form.bio.trim() || null,
        instagram_handle: form.instagram_handle.trim() || null,
        is_exclusive_available: form.is_exclusive_available,
        industry_tags: form.industry_tags,
        mood_tags: form.mood_tags,
      };

      const res = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "저장 실패");
      }

      const updated = await res.json();
      setModel(updated as Model);
      setEditMode(false);
      setForm(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 중 오류 발생");
    } finally {
      setSaving(false);
    }
  }

  // ── render states ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!model) return null;

  const m = model;
  const debutDate = m.debut_date ? new Date(m.debut_date) : null;
  const ageYears = debutDate
    ? Math.floor(
        (Date.now() - debutDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/models">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {editMode && form ? (
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, name: e.target.value } : f))
                }
                className="text-2xl font-bold bg-zinc-900 border-zinc-700 h-10 w-64"
              />
            ) : (
              <h1 className="text-2xl font-bold">{m.name}</h1>
            )}
            <Badge
              className={
                m.status === "active"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : m.status === "draft"
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
              }
            >
              {m.status}
            </Badge>
          </div>
          {ageYears !== null && (
            <p className="text-zinc-400 text-sm mt-1">생체나이 {ageYears}세</p>
          )}
        </div>

        {/* Edit / Save / Cancel buttons */}
        {editMode ? (
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-400">{saveError}</span>
            )}
            <Button
              variant="outline"
              className="border-zinc-700"
              onClick={cancelEdit}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button
              className="bg-white text-black hover:bg-zinc-200"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-zinc-700"
            onClick={startEdit}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Concept image */}
        <div className="col-span-1">
          {m.concept_image ? (
            <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.concept_image}
                alt={m.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[3/4] rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="col-span-2 space-y-6">
          {/* 단가 + 독점 */}
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="팔로워"
              value={(m.follower_count ?? 0).toLocaleString()}
            />

            {editMode && form ? (
              <>
                <div className="bg-zinc-900 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">기본 단가</p>
                  <Input
                    type="number"
                    value={form.base_price}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, base_price: e.target.value } : f
                      )
                    }
                    placeholder="0"
                    className="bg-zinc-800 border-zinc-700 h-7 text-sm px-2"
                  />
                </div>
                <div className="bg-zinc-900 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">독점 단가</p>
                  <Input
                    type="number"
                    value={form.exclusive_price}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, exclusive_price: e.target.value } : f
                      )
                    }
                    placeholder="0"
                    className="bg-zinc-800 border-zinc-700 h-7 text-sm px-2"
                  />
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">독점 가능</p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              is_exclusive_available: !f.is_exclusive_available,
                            }
                          : f
                      )
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.is_exclusive_available
                        ? "bg-green-500"
                        : "bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        form.is_exclusive_available
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Stat
                  label="기본 단가"
                  value={
                    m.base_price ? `₩${m.base_price.toLocaleString()}/일` : "-"
                  }
                />
                <Stat
                  label="독점 단가"
                  value={
                    m.exclusive_price
                      ? `₩${m.exclusive_price.toLocaleString()}/일`
                      : "-"
                  }
                />
                <Stat
                  label="독점 가능"
                  value={m.is_exclusive_available ? "가능" : "불가"}
                />
              </>
            )}
          </div>

          {/* 인스타그램 핸들 */}
          {editMode && form ? (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">
                인스타그램 핸들
              </h3>
              <Input
                value={form.instagram_handle}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, instagram_handle: e.target.value } : f
                  )
                }
                placeholder="@handle"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
          ) : (
            m.instagram_handle && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  인스타그램
                </h3>
                <p className="text-zinc-200 text-sm">@{m.instagram_handle}</p>
              </div>
            )
          )}

          {/* 바이오 */}
          {editMode && form ? (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">바이오</h3>
              <Textarea
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, bio: e.target.value } : f))
                }
                rows={4}
                className="bg-zinc-900 border-zinc-700 resize-none"
                placeholder="모델 바이오를 입력하세요"
              />
            </div>
          ) : (
            m.bio && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  바이오
                </h3>
                <p className="text-zinc-200 text-sm leading-relaxed">{m.bio}</p>
              </div>
            )
          )}

          {/* 산업 태그 */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">산업 태그</h3>
            {editMode && form ? (
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((opt) => {
                  const active = form.industry_tags.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTag("industry_tags", opt.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "bg-white text-black border-white"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (m.industry_tags?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {m.industry_tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-zinc-800 text-zinc-300"
                  >
                    {INDUSTRY_LABELS[tag] ?? tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">-</p>
            )}
          </div>

          {/* 분위기 태그 */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">분위기 태그</h3>
            {editMode && form ? (
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((opt) => {
                  const active = form.mood_tags.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTag("mood_tags", opt.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "bg-white text-black border-white"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (m.mood_tags?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {m.mood_tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-zinc-800 text-zinc-300"
                  >
                    {MOOD_LABELS[tag] ?? tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">-</p>
            )}
          </div>
        </div>
      </div>

      {/* Generated files */}
      {files.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">생성 파일</h2>
          <div className="grid grid-cols-4 gap-3">
            {files.map((f) => (
              <div
                key={f.id}
                className="aspect-[3/4] relative rounded bg-zinc-900 overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
