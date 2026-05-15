"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Download,
  Film,
  Mic,
  Upload,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Model } from "@/types";

type Stage = "idle" | "submitting" | "polling" | "done" | "failed";

interface JobState {
  id: string | null;
  stage: Stage;
  output: string | null;
  provider: string | null;
  mock: boolean;
  error: string | null;
}

const initialJob: JobState = {
  id: null,
  stage: "idle",
  output: null,
  provider: null,
  mock: false,
  error: null,
};

interface Props {
  models: Model[];
}

const ASPECT_OPTIONS = ["9:16", "16:9", "1:1"] as const;
const DURATION_OPTIONS = [5, 10] as const;

export default function VideoStudio({ models }: Props) {
  // Source image — either selected model's concept image or uploaded URL.
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    models[0]?.id ?? null
  );
  const [customImageUrl, setCustomImageUrl] = useState("");

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspect, setAspect] = useState<(typeof ASPECT_OPTIONS)[number]>("9:16");
  const [duration, setDuration] = useState<(typeof DURATION_OPTIONS)[number]>(5);

  // Video job state
  const [videoJob, setVideoJob] = useState<JobState>(initialJob);
  const videoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lipsync job state — only meaningful after video finishes.
  const [audioUrl, setAudioUrl] = useState("");
  const [lipsyncJob, setLipsyncJob] = useState<JobState>(initialJob);
  const lipsyncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup intervals on unmount.
  useEffect(
    () => () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
      if (lipsyncPollRef.current) clearInterval(lipsyncPollRef.current);
    },
    []
  );

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const resolvedImageUrl =
    customImageUrl.trim() || selectedModel?.concept_image || "";

  async function startVideo() {
    if (!resolvedImageUrl || !prompt.trim()) return;
    setVideoJob({ ...initialJob, stage: "submitting" });
    setLipsyncJob(initialJob); // reset downstream

    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: resolvedImageUrl,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          aspectRatio: aspect,
          durationSec: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "비디오 생성 시작 실패");

      setVideoJob({
        id: data.id,
        stage: "polling",
        output: null,
        provider: data.provider ?? null,
        mock: !!data.mock,
        error: null,
      });
      pollVideo(data.id);
    } catch (e) {
      setVideoJob({
        ...initialJob,
        stage: "failed",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  }

  function pollVideo(id: string) {
    if (videoPollRef.current) clearInterval(videoPollRef.current);
    let consecutiveErrors = 0;
    videoPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/video/${id}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        consecutiveErrors = 0;
        if (data.status === "succeeded") {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          setVideoJob((prev) => ({
            ...prev,
            stage: "done",
            output: data.output ?? null,
            mock: prev.mock || !!data.mock,
          }));
        } else if (data.status === "failed" || data.status === "canceled") {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          setVideoJob((prev) => ({
            ...prev,
            stage: "failed",
            error: data.error ?? "비디오 생성 실패",
          }));
        }
      } catch {
        consecutiveErrors += 1;
        // Give up after a stretch of errors so the interval doesn't leak.
        if (consecutiveErrors >= 5) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          setVideoJob((prev) => ({
            ...prev,
            stage: "failed",
            error: "상태 조회 실패가 반복됩니다. 잠시 후 다시 시도하세요.",
          }));
        }
      }
    }, 4000);
  }

  async function startLipsync() {
    const sourceVideo = videoJob.output;
    if (!sourceVideo || !audioUrl.trim()) return;
    setLipsyncJob({ ...initialJob, stage: "submitting" });

    try {
      const res = await fetch("/api/generate/lipsync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: sourceVideo,
          audioUrl: audioUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "립싱크 시작 실패");

      setLipsyncJob({
        id: data.id,
        stage: "polling",
        output: null,
        provider: data.provider ?? null,
        mock: !!data.mock,
        error: null,
      });
      pollLipsync(data.id);
    } catch (e) {
      setLipsyncJob({
        ...initialJob,
        stage: "failed",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  }

  function pollLipsync(id: string) {
    if (lipsyncPollRef.current) clearInterval(lipsyncPollRef.current);
    let consecutiveErrors = 0;
    lipsyncPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/lipsync/${id}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        consecutiveErrors = 0;
        if (data.status === "succeeded") {
          if (lipsyncPollRef.current) clearInterval(lipsyncPollRef.current);
          setLipsyncJob((prev) => ({
            ...prev,
            stage: "done",
            output: data.output ?? null,
            mock: prev.mock || !!data.mock,
          }));
        } else if (data.status === "failed" || data.status === "canceled") {
          if (lipsyncPollRef.current) clearInterval(lipsyncPollRef.current);
          setLipsyncJob((prev) => ({
            ...prev,
            stage: "failed",
            error: data.error ?? "립싱크 실패",
          }));
        }
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors >= 5) {
          if (lipsyncPollRef.current) clearInterval(lipsyncPollRef.current);
          setLipsyncJob((prev) => ({
            ...prev,
            stage: "failed",
            error: "상태 조회 실패가 반복됩니다. 잠시 후 다시 시도하세요.",
          }));
        }
      }
    }, 4000);
  }

  const canStartVideo =
    !!resolvedImageUrl && !!prompt.trim() && videoJob.stage !== "submitting" && videoJob.stage !== "polling";
  const canStartLipsync =
    videoJob.stage === "done" &&
    !!videoJob.output &&
    !!audioUrl.trim() &&
    lipsyncJob.stage !== "submitting" &&
    lipsyncJob.stage !== "polling";

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Video Studio</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          image → video → (선택) lipsync. Replicate 기반 비동기 파이프라인.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* ── Left: source + controls ─────────────────────────────────── */}
        <section className="col-span-5 space-y-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold">1. 소스 이미지</h2>
            </div>

            {models.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">모델에서 선택</Label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {models.slice(0, 12).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setCustomImageUrl("");
                      }}
                      className={`w-14 h-18 aspect-[3/4] relative rounded-md overflow-hidden border-2 transition-colors ${
                        selectedModelId === m.id && !customImageUrl
                          ? "border-white"
                          : "border-transparent hover:border-zinc-500"
                      }`}
                      title={m.name}
                    >
                      {m.concept_image ? (
                        <Image
                          src={m.concept_image}
                          alt={m.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">등록된 모델 없음 — URL 직접 입력</p>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 flex items-center gap-1">
                <Upload className="w-3 h-3" /> 또는 이미지 URL
              </Label>
              <input
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {resolvedImageUrl && (
              <div className="aspect-[3/4] max-w-[180px] relative rounded-lg overflow-hidden bg-zinc-900">
                <Image
                  src={resolvedImageUrl}
                  alt="source"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold">2. 비디오 파라미터</h2>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">프롬프트</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="예: 모델이 카메라 쪽으로 천천히 걸어오며 머리를 살짝 넘긴다, 차가운 광택, 럭셔리 광고 톤"
                className="bg-zinc-900 border-zinc-800 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">네거티브 프롬프트 (선택)</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={2}
                placeholder="distorted face, deformed limbs, low quality"
                className="bg-zinc-900 border-zinc-800 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">길이 (초)</Label>
                <div className="flex gap-1">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        duration === d
                          ? "bg-white text-black border-white"
                          : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">비율</Label>
                <div className="flex gap-1">
                  {ASPECT_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAspect(a)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        aspect === a
                          ? "bg-white text-black border-white"
                          : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={startVideo}
              disabled={!canStartVideo}
              className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-40"
            >
              {videoJob.stage === "submitting" || videoJob.stage === "polling" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                "비디오 생성"
              )}
            </Button>
            <p className="text-[10px] text-zinc-600 text-center -mt-1">
              평균 소요 시간: 1~5분. 닫지 마세요.
            </p>
          </div>
        </section>

        {/* ── Right: results + lipsync ────────────────────────────────── */}
        <section className="col-span-7 space-y-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4 min-h-[280px]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Film className="w-4 h-4 text-zinc-400" /> 결과
              </h2>
              {videoJob.provider && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  {videoJob.provider}
                  {videoJob.mock && " · mock"}
                </span>
              )}
            </div>

            <VideoSlot job={videoJob} placeholder="비디오를 생성하면 여기에 표시됩니다." />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold">3. 립싱크 (선택)</h2>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">오디오 URL (.mp3 / .wav)</Label>
              <input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://.../voice.mp3"
                disabled={videoJob.stage !== "done"}
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
              />
              {videoJob.stage !== "done" && (
                <p className="text-[10px] text-zinc-600">비디오 생성 완료 후 활성화됩니다.</p>
              )}
            </div>

            <Button
              onClick={startLipsync}
              disabled={!canStartLipsync}
              variant="outline"
              className="w-full border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
            >
              {lipsyncJob.stage === "submitting" || lipsyncJob.stage === "polling" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  립싱크 처리 중...
                </>
              ) : (
                "립싱크 적용"
              )}
            </Button>

            {(lipsyncJob.stage !== "idle" || lipsyncJob.error) && (
              <div className="pt-3 border-t border-zinc-800">
                <VideoSlot job={lipsyncJob} placeholder="" compact />
                {lipsyncJob.provider && (
                  <p className="text-[10px] text-zinc-500 font-mono mt-1 text-right">
                    {lipsyncJob.provider}
                    {lipsyncJob.mock && " · mock"}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function VideoSlot({
  job,
  placeholder,
  compact = false,
}: {
  job: JobState;
  placeholder: string;
  compact?: boolean;
}) {
  if (job.stage === "polling" || job.stage === "submitting") {
    return (
      <div className={`flex items-center gap-3 ${compact ? "py-2" : "py-10 justify-center"}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-400">
          {job.stage === "submitting" ? "제출 중..." : "생성 중..."}
        </span>
        {job.id && (
          <span className="text-[10px] font-mono text-zinc-600 ml-auto">{job.id}</span>
        )}
      </div>
    );
  }

  if (job.stage === "failed") {
    return (
      <div className="flex items-start gap-2 bg-red-950/30 border border-red-900 rounded-md px-3 py-2.5">
        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <p className="text-sm text-red-300">{job.error ?? "실패"}</p>
      </div>
    );
  }

  if (job.stage === "done" && job.output) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Check className="w-4 h-4" />
          완료
        </div>
        <video
          src={job.output}
          controls
          className="w-full max-w-md rounded-lg bg-black"
        />
        <div className="flex gap-2">
          <a href={job.output} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-zinc-700">
              <Download className="w-3 h-3 mr-1" /> 다운로드
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (placeholder) {
    return (
      <div className="flex items-center justify-center h-32 border border-dashed border-zinc-800 rounded-md">
        <p className="text-sm text-zinc-600">{placeholder}</p>
      </div>
    );
  }
  return null;
}
