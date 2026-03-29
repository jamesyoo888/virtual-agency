"use client";

import { useState, useRef } from "react";
import { Download, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";

interface GenerationResult {
  id: string;
  prompt: string;
  urls: string[];
  timestamp: Date;
}

function SkeletonCard() {
  return (
    <div className="aspect-square rounded-lg bg-zinc-800 animate-pulse flex items-center justify-center">
      <ImageIcon className="w-8 h-8 text-zinc-600" />
    </div>
  );
}

function ImageCard({ url, index }: { url: string; index: number }) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-${Date.now()}-${index + 1}.png`;
    a.click();
  };

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Generated image ${index + 1}`}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
      <button
        onClick={handleDownload}
        className="absolute bottom-2 right-2 p-2 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
        title="다운로드"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

function HistorySection({ result }: { result: GenerationResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
      >
        <span className="truncate mr-2 text-left">
          <span className="text-zinc-500 text-xs mr-2">
            {result.timestamp.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {result.prompt}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-zinc-600">{result.urls.length}장</span>
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 p-3 border-t border-zinc-800 bg-zinc-900/50">
          {result.urls.map((url, i) => (
            <ImageCard key={i} url={url} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [negativeOpen, setNegativeOpen] = useState(false);
  const [count, setCount] = useState<1 | 2 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUrls, setCurrentUrls] = useState<string[] | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [history, setHistory] = useState<GenerationResult[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setCurrentUrls(null);
    setCurrentPrompt(prompt.trim());

    abortRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 120_000);

    try {
      const fullPrompt = negativePrompt.trim()
        ? `${prompt.trim()} ### negative: ${negativePrompt.trim()}`
        : prompt.trim();

      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, count }),
        signal: abortRef.current.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `서버 오류 (${res.status})`
        );
      }

      const data = (await res.json()) as { urls: string[] };
      const urls = data.urls ?? [];

      setCurrentUrls(urls);

      const newResult: GenerationResult = {
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        urls,
        timestamp: new Date(),
      };
      setHistory((prev) => [newResult, ...prev].slice(0, 3));
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("요청 시간이 초과되었습니다 (2분). 다시 시도해주세요.");
        } else {
          setError(err.message || "이미지 생성에 실패했습니다.");
        }
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
      setCurrentUrls(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Image Studio</h1>
        <p className="text-zinc-400 mt-1">AI 이미지 생성 — Replicate API</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-14rem)]">
        {/* Left Panel — Controls */}
        <div className="w-1/3 shrink-0 flex flex-col gap-4">
          {/* Prompt */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              프롬프트
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="이미지를 묘사하세요. 예: a professional female model wearing a white dress, studio lighting, 8k"
              rows={5}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 px-3 py-2.5 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Negative Prompt — collapsible */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setNegativeOpen(!negativeOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white uppercase tracking-wider hover:bg-zinc-800/50 transition-colors"
            >
              <span>네거티브 프롬프트</span>
              {negativeOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {negativeOpen && (
              <div className="border-t border-zinc-800 p-3">
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="생성하지 않을 요소. 예: blurry, low quality, distorted face"
                  rows={3}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 px-3 py-2 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Count selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              생성 수
            </label>
            <div className="flex gap-2">
              {([1, 2, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    count === n
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  {n}장
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                생성 중...
              </span>
            ) : (
              "생성하기"
            )}
          </button>

          {/* Time hint */}
          <p className="text-xs text-zinc-600 text-center">
            약 10~40초 소요 · 최대 2분 대기
          </p>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Right Panel — Gallery */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Current result / skeleton */}
          <div>
            {loading && (
              <div>
                <p className="text-xs text-zinc-500 mb-3">
                  &quot;{currentPrompt}&quot; 생성 중...
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: count }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            )}

            {!loading && currentUrls && currentUrls.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-3 truncate">
                  &quot;{currentPrompt}&quot;
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {currentUrls.map((url, i) => (
                    <ImageCard key={i} url={url} index={i} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !currentUrls && !error && (
              <div className="flex items-center justify-center h-48 border border-dashed border-zinc-800 rounded-xl text-zinc-600">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">프롬프트를 입력하고 생성하기를 누르세요</p>
                </div>
              </div>
            )}
          </div>

          {/* Session history */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                세션 히스토리
              </p>
              <div className="flex flex-col gap-2">
                {history.map((result) => (
                  <HistorySection key={result.id} result={result} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
