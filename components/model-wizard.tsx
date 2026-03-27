"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
// Note: AI-generated images use <img> directly to bypass Next.js image proxy
// eslint-disable-next-line @next/next/no-img-element
import { Loader2, Check, Upload, Box, Image as ImageIcon, RefreshCw, ExternalLink } from "lucide-react";

// ── constants ────────────────────────────────────────────────────────────────

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
const ANGLES = [
  { key: "front",    label: "정면",    suffix: "front view, facing camera" },
  { key: "three4",   label: "3/4 앵글", suffix: "three quarter angle view" },
  { key: "side",     label: "측면",    suffix: "side profile view" },
  { key: "back",     label: "후면",    suffix: "back view" },
  { key: "closeup",  label: "클로즈업", suffix: "close up face shot" },
  { key: "fullbody", label: "전신",    suffix: "full body shot" },
];

const STEPS = [
  "페르소나",
  "컨셉 셀렉션",
  "다각도 2D",
  "3D 작업",
  "최종 2D",
];

// ── types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// ── main component ───────────────────────────────────────────────────────────

export default function ModelWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 – Persona
  const [form, setForm] = useState({
    name: "",
    debut_date: "",
    bio: "",
    personality: "",
    instagram_handle: "",
    base_price: "",
    exclusive_price: "",
    industry_tags: [] as string[],
    genre_tags: [] as string[],
    mood_tags: [] as string[],
  });

  // Step 2 – Concept selection
  const [prompt, setPrompt] = useState("");
  const [conceptImages, setConceptImages] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [generatingConcept, setGeneratingConcept] = useState(false);

  // Step 3 – Multi-angle 2D
  const [angleImages, setAngleImages] = useState<Record<string, string[]>>({});
  const [selectedAngles, setSelectedAngles] = useState<Record<string, string>>({});
  const [generatingAngle, setGeneratingAngle] = useState<string | null>(null);

  // Step 4 – 3D / Meshy
  const [meshyTaskId, setMeshyTaskId] = useState<string | null>(null);
  const [meshyStatus, setMeshyStatus] = useState<"idle" | "submitting" | "polling" | "done" | "failed">("idle");
  const [meshyProgress, setMeshyProgress] = useState(0);
  const [meshyResult, setMeshyResult] = useState<{ thumbnail?: string; glb?: string; fbx?: string; mock?: boolean } | null>(null);
  const [threeDNote, setThreeDNote] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 5 – Final 2D
  const [finalImages, setFinalImages] = useState<string[]>([]);
  const [selectedFinal, setSelectedFinal] = useState<string[]>([]);
  const [generatingFinal, setGeneratingFinal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdModel, setCreatedModel] = useState<AnyRecord | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  function toggleTag(type: "industry_tags" | "genre_tags" | "mood_tags", value: string) {
    setForm((f) => ({
      ...f,
      [type]: f[type].includes(value) ? f[type].filter((v) => v !== value) : [...f[type], value],
    }));
  }

  async function generateImages(prompt: string, count = 4): Promise<string[]> {
    const res = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, count }),
    });
    if (!res.ok) throw new Error("이미지 생성 실패");
    const { urls } = await res.json();
    return urls;
  }

  // ── step handlers ─────────────────────────────────────────────────────────

  async function handleGenerateConcept() {
    if (!prompt.trim()) return;
    setGeneratingConcept(true);
    setError(null);
    try {
      const urls = await generateImages(prompt, 4);
      setConceptImages(urls);
    } catch {
      setError("이미지 생성에 실패했습니다.");
    }
    setGeneratingConcept(false);
  }

  async function handleGenerateAngle(angle: typeof ANGLES[0]) {
    if (!selectedConcept) return;
    setGeneratingAngle(angle.key);
    setError(null);
    try {
      const anglePrompt = `${prompt}, ${angle.suffix}`;
      const urls = await generateImages(anglePrompt, 4);
      setAngleImages((prev) => ({ ...prev, [angle.key]: urls }));
    } catch {
      setError(`${angle.label} 이미지 생성 실패`);
    }
    setGeneratingAngle(null);
  }

  // cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  async function handleSubmitMeshy() {
    const imageUrl = selectedConcept ?? Object.values(selectedAngles)[0];
    if (!imageUrl) return;

    setMeshyStatus("submitting");
    setError(null);
    setMeshyProgress(0);
    setMeshyResult(null);

    try {
      const res = await fetch("/api/meshy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Meshy 제출 실패");

      setMeshyTaskId(data.taskId);
      setMeshyStatus("polling");
      startPolling(data.taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 실패");
      setMeshyStatus("failed");
    }
  }

  function startPolling(taskId: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/meshy/task/${taskId}`);
        const task = await res.json();

        setMeshyProgress(task.progress ?? 0);

        if (task.status === "SUCCEEDED") {
          clearInterval(pollingRef.current!);
          setMeshyStatus("done");
          setMeshyResult({
            thumbnail: task.thumbnail_url,
            glb: task.model_urls?.glb,
            fbx: task.model_urls?.fbx,
            mock: task.mock,
          });
        } else if (task.status === "FAILED" || task.status === "EXPIRED") {
          clearInterval(pollingRef.current!);
          setMeshyStatus("failed");
          setError(task.error_message ?? "3D 생성 실패");
        }
      } catch {
        // keep polling on transient errors
      }
    }, 4000); // poll every 4s
  }

  async function handleGenerateFinal() {
    setGeneratingFinal(true);
    setError(null);
    try {
      const finalPrompt = `${prompt}, professional editorial photography, final render`;
      const urls = await generateImages(finalPrompt, 6);
      setFinalImages(urls);
    } catch {
      setError("최종 이미지 생성 실패");
    }
    setGeneratingFinal(false);
  }

  function toggleFinal(url: string) {
    setSelectedFinal((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("모델명을 입력하세요."); return; }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        concept_image: selectedConcept,
        base_price: form.base_price ? parseInt(form.base_price) : null,
        exclusive_price: form.exclusive_price ? parseInt(form.exclusive_price) : null,
      }),
    });

    if (res.ok) {
      const model = await res.json();
      setCreatedModel({ ...model, concept_image: selectedConcept });
      setStep(5);
    } else {
      const { error: msg } = await res.json();
      setError(msg ?? "저장 실패");
    }
    setSaving(false);
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10 flex-wrap">
        {STEPS.map((label, i) => {
          const s = (i + 1) as Step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                ${step > s ? "bg-white text-black" : step === s ? "bg-white text-black ring-2 ring-white/30" : "bg-zinc-800 text-zinc-500"}`}>
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-sm ${step === s ? "text-white font-medium" : "text-zinc-500"}`}>{label}</span>
              {s < 5 && <div className="w-6 h-px bg-zinc-700 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Persona ── */}
      {step === 1 && (
        <div className="space-y-6 max-w-2xl">
          <p className="text-zinc-400 text-sm">모델의 기본 정보와 캐릭터 특성을 입력하세요.</p>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>모델명 *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-zinc-900 border-zinc-800" placeholder="예: ARIA" />
            </div>
            <div className="space-y-2">
              <Label>데뷔일 (생년월일)</Label>
              <Input type="date" value={form.debut_date} onChange={(e) => setForm((f) => ({ ...f, debut_date: e.target.value }))}
                className="bg-zinc-900 border-zinc-800" />
            </div>
            <div className="space-y-2">
              <Label>기본 단가 (원/일)</Label>
              <Input type="number" value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                className="bg-zinc-900 border-zinc-800" placeholder="500000" />
            </div>
            <div className="space-y-2">
              <Label>독점 단가 (원/일)</Label>
              <Input type="number" value={form.exclusive_price} onChange={(e) => setForm((f) => ({ ...f, exclusive_price: e.target.value }))}
                className="bg-zinc-900 border-zinc-800" placeholder="2000000" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>인스타그램</Label>
              <Input value={form.instagram_handle} onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))}
                className="bg-zinc-900 border-zinc-800" placeholder="@handle" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>바이오</Label>
            <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="bg-zinc-900 border-zinc-800" placeholder="모델 소개 및 세계관..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label>성격/톤</Label>
            <Textarea value={form.personality} onChange={(e) => setForm((f) => ({ ...f, personality: e.target.value }))}
              className="bg-zinc-900 border-zinc-800" placeholder="차갑고 미스터리한 분위기, 럭셔리 브랜드 최적화..." rows={2} />
          </div>

          <TagSelector label="산업 태그" options={INDUSTRY_OPTIONS} selected={form.industry_tags} onToggle={(v) => toggleTag("industry_tags", v)} />
          <TagSelector label="장르 태그" options={GENRE_OPTIONS} selected={form.genre_tags} onToggle={(v) => toggleTag("genre_tags", v)} />
          <TagSelector label="분위기 태그" options={MOOD_OPTIONS} selected={form.mood_tags} onToggle={(v) => toggleTag("mood_tags", v)} />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end pt-2">
            <Button onClick={() => { if (!form.name.trim()) { setError("모델명을 입력하세요."); return; } setError(null); setStep(2); }}
              className="bg-white text-black hover:bg-zinc-200">
              다음: 컨셉 생성 →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Concept selection ── */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-zinc-400 text-sm">
            <span className="text-white font-medium">{form.name}</span>의 컨셉 이미지를 생성하고 1장을 선택하세요.
          </p>

          <div className="space-y-2">
            <Label>프롬프트</Label>
            <div className="flex gap-2">
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)}
                className="bg-zinc-900 border-zinc-800 flex-1"
                placeholder="예: 20대 초반 한국인 여성, 차갑고 세련된 분위기, 럭셔리 모델..."
                onKeyDown={(e) => e.key === "Enter" && handleGenerateConcept()} />
              <Button onClick={handleGenerateConcept} disabled={generatingConcept || !prompt.trim()}
                className="bg-white text-black hover:bg-zinc-200 shrink-0">
                {generatingConcept ? <Loader2 className="w-4 h-4 animate-spin" /> : "생성"}
              </Button>
            </div>
          </div>

          {conceptImages.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-3">마음에 드는 컨셉 이미지를 선택하세요.</p>
              <div className="grid grid-cols-4 gap-3">
                {conceptImages.map((url, i) => (
                  <button key={i} onClick={() => setSelectedConcept(url)}
                    className={`aspect-[3/4] relative rounded-lg overflow-hidden border-2 transition-all
                      ${selectedConcept === url ? "border-white" : "border-transparent hover:border-zinc-500"}`}>
                    <img src={url} alt={`Concept ${i + 1}`} className="object-cover w-full h-full absolute inset-0" />
                    {selectedConcept === url && (
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

          <div className="flex gap-3 justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-400">← 이전</Button>
            <Button onClick={() => setStep(3)} disabled={!selectedConcept}
              className="bg-white text-black hover:bg-zinc-200">
              다음: 다각도 2D →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Multi-angle 2D ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            {selectedConcept && (
              <div className="shrink-0">
                <p className="text-xs text-zinc-500 mb-2">선택된 컨셉</p>
                <div className="w-24 aspect-[3/4] relative rounded-lg overflow-hidden bg-zinc-900">
                  <img src={selectedConcept} alt="Concept" className="object-cover w-full h-full absolute inset-0" />
                </div>
              </div>
            )}
            <div>
              <p className="text-zinc-400 text-sm">각 각도별 2D 이미지를 생성하고 최적 샷을 선택하세요.</p>
              <p className="text-xs text-zinc-600 mt-1">최소 2가지 각도 이상 생성 권장</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {ANGLES.map((angle) => {
              const imgs = angleImages[angle.key] ?? [];
              const selected = selectedAngles[angle.key];
              const isGenerating = generatingAngle === angle.key;

              return (
                <div key={angle.key} className="bg-zinc-900/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{angle.label}</span>
                    {selected && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">선택됨</Badge>}
                  </div>

                  {imgs.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {imgs.map((url, i) => (
                        <button key={i} onClick={() => setSelectedAngles((prev) => ({ ...prev, [angle.key]: url }))}
                          className={`aspect-[3/4] relative rounded overflow-hidden border transition-all
                            ${selected === url ? "border-white" : "border-transparent hover:border-zinc-500"}`}>
                          <img src={url} alt="" className="object-cover w-full h-full absolute inset-0" />
                          {selected === url && (
                            <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-20 flex items-center justify-center">
                      <p className="text-xs text-zinc-600">이미지 없음</p>
                    </div>
                  )}

                  <Button onClick={() => handleGenerateAngle(angle)} disabled={isGenerating}
                    variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />생성 중...</> : `${angle.label} 생성`}
                  </Button>
                </div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="text-zinc-400">← 이전</Button>
            <Button onClick={() => setStep(4)}
              disabled={Object.keys(selectedAngles).length < 1}
              className="bg-white text-black hover:bg-zinc-200">
              승인 → 3D 작업
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: 3D work (Meshy AI) ── */}
      {step === 4 && (
        <div className="space-y-6 max-w-2xl">

          {/* Header */}
          <div className="flex items-start gap-3 p-4 bg-zinc-900 rounded-xl">
            <Box className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">3D 모델링 — Meshy AI</p>
              <p className="text-xs text-zinc-500">선택된 2D 이미지를 Meshy AI로 전송해 3D 모델을 자동 생성합니다.</p>
            </div>
          </div>

          {/* Reference images */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">참조 이미지 (컨셉 + 다각도 {Object.keys(selectedAngles).length}장)</p>
            <div className="flex gap-2 flex-wrap">
              {selectedConcept && (
                <div>
                  <div className="w-14 aspect-[3/4] relative rounded overflow-hidden bg-zinc-900">
                    <img src={selectedConcept} alt="concept" className="object-cover w-full h-full absolute inset-0" />
                  </div>
                  <p className="text-xs text-zinc-600 text-center mt-1">컨셉</p>
                </div>
              )}
              {Object.entries(selectedAngles).map(([key, url]) => (
                <div key={key}>
                  <div className="w-14 aspect-[3/4] relative rounded overflow-hidden bg-zinc-900">
                    <img src={url} alt={key} className="object-cover w-full h-full absolute inset-0" />
                  </div>
                  <p className="text-xs text-zinc-600 text-center mt-1">{ANGLES.find(a => a.key === key)?.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Meshy status area */}
          {meshyStatus === "idle" && (
            <div className="border border-dashed border-zinc-700 rounded-xl p-8 text-center space-y-3">
              <Box className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">컨셉 이미지를 Meshy AI로 전송해 3D 모델을 생성합니다.</p>
              <p className="text-xs text-zinc-600">평균 소요 시간: 2~5분</p>
              <Button onClick={handleSubmitMeshy} className="bg-white text-black hover:bg-zinc-200 mt-2">
                Meshy AI로 3D 생성 시작
              </Button>
            </div>
          )}

          {meshyStatus === "submitting" && (
            <div className="border border-zinc-800 rounded-xl p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
              <p className="text-sm text-zinc-400">Meshy AI에 작업 제출 중...</p>
            </div>
          )}

          {meshyStatus === "polling" && (
            <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />
                  <span className="text-sm text-zinc-300">3D 생성 중...</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">{meshyProgress}%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${meshyProgress}%` }} />
              </div>
              <p className="text-xs text-zinc-600">작업 ID: {meshyTaskId}</p>
            </div>
          )}

          {meshyStatus === "done" && meshyResult && (
            <div className="border border-green-500/30 bg-green-500/5 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">3D 모델 생성 완료!</span>
                {meshyResult.mock && <Badge className="bg-zinc-800 text-zinc-400 text-xs">dev 모드</Badge>}
              </div>

              <div className="flex gap-4 items-start">
                {meshyResult.thumbnail && (
                  <div className="w-24 aspect-square relative rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                    <img src={meshyResult.thumbnail} alt="3D thumbnail" className="object-cover w-full h-full absolute inset-0" />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">다운로드</p>
                  <div className="flex gap-2 flex-wrap">
                    {meshyResult.glb && (
                      <a href={meshyResult.glb} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="border-zinc-700 text-xs">
                          <ExternalLink className="w-3 h-3 mr-1" /> GLB
                        </Button>
                      </a>
                    )}
                    {meshyResult.fbx && (
                      <a href={meshyResult.fbx} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="border-zinc-700 text-xs">
                          <ExternalLink className="w-3 h-3 mr-1" /> FBX
                        </Button>
                      </a>
                    )}
                    {!meshyResult.glb && !meshyResult.fbx && (
                      <p className="text-xs text-zinc-600">파일 링크: Meshy 대시보드에서 확인</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {meshyStatus === "failed" && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-6 space-y-3">
              <p className="text-sm text-red-400">3D 생성 실패: {error}</p>
              <Button onClick={handleSubmitMeshy} variant="outline" className="border-zinc-700">
                재시도
              </Button>
            </div>
          )}

          {/* Manual note */}
          <div className="space-y-2">
            <Label>작업 메모</Label>
            <Textarea value={threeDNote} onChange={(e) => setThreeDNote(e.target.value)}
              className="bg-zinc-900 border-zinc-800" placeholder="3D 작업 관련 메모, 전달 사항..." rows={2} />
          </div>

          {/* Manual file upload fallback */}
          <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center">
            <Upload className="w-5 h-5 text-zinc-700 mx-auto mb-1" />
            <p className="text-xs text-zinc-600">수동 3D 파일 업로드 (.glb .fbx .obj) — 추후 연동</p>
          </div>

          {error && meshyStatus !== "failed" && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(3)} className="text-zinc-400">← 이전</Button>
            <Button onClick={handleSave} disabled={saving || meshyStatus !== "done"}
              className="bg-white text-black hover:bg-zinc-200">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />저장 중...</> : "완료 → 최종 2D"}
            </Button>
          </div>
          {meshyStatus !== "done" && (
            <p className="text-xs text-zinc-600 text-right -mt-4">3D 생성이 완료되어야 다음 단계로 진행됩니다.</p>
          )}
        </div>
      )}

      {/* ── STEP 5: Final 2D ── */}
      {step === 5 && createdModel && (
        <div className="space-y-8">
          {/* Created model summary */}
          <div className="flex gap-6 items-start">
            {createdModel.concept_image && (
              <div className="w-28 aspect-[3/4] relative rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                <img src={createdModel.concept_image} alt={createdModel.name} className="object-cover w-full h-full absolute inset-0" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{createdModel.name}</h2>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">draft</Badge>
              </div>
              {createdModel.debut_date && <p className="text-zinc-400 text-sm">데뷔일: {createdModel.debut_date}</p>}
              <div className="flex gap-2 flex-wrap">
                {createdModel.industry_tags?.map((t: string) => (
                  <Badge key={t} className="bg-zinc-800 text-zinc-300 text-xs">{INDUSTRY_OPTIONS.find(o => o.value === t)?.label ?? t}</Badge>
                ))}
                {createdModel.mood_tags?.map((t: string) => (
                  <Badge key={t} className="bg-zinc-800 text-zinc-300 text-xs">{MOOD_OPTIONS.find(o => o.value === t)?.label ?? t}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Final 2D generation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                  최종 2D 마무리
                </h3>
                <p className="text-xs text-zinc-500 mt-1">완성된 모델의 최종 에디토리얼 이미지를 생성합니다.</p>
              </div>
              <Button onClick={handleGenerateFinal} disabled={generatingFinal}
                variant="outline" className="border-zinc-700">
                {generatingFinal ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />생성 중...</> : "최종 이미지 생성"}
              </Button>
            </div>

            {finalImages.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-3">원하는 이미지를 선택하세요 (다중 선택 가능)</p>
                <div className="grid grid-cols-6 gap-2">
                  {finalImages.map((url, i) => (
                    <button key={i} onClick={() => toggleFinal(url)}
                      className={`aspect-[3/4] relative rounded-lg overflow-hidden border-2 transition-all
                        ${selectedFinal.includes(url) ? "border-white" : "border-transparent hover:border-zinc-500"}`}>
                      <img src={url} alt={`Final ${i + 1}`} className="object-cover w-full h-full absolute inset-0" />
                      {selectedFinal.includes(url) && (
                        <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-zinc-800">
            <Button onClick={() => router.push("/admin/models/new")} variant="outline" className="border-zinc-700">
              + 새 모델 추가
            </Button>
            <Button onClick={() => router.push("/admin/models")} className="bg-white text-black hover:bg-zinc-200">
              목록으로
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

function TagSelector({ label, options, selected, onToggle }: {
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
            <Badge className={selected.includes(opt.value)
              ? "bg-white text-black cursor-pointer"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 cursor-pointer"}>
              {opt.label}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
