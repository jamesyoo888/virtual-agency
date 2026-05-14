"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-8">
      <div className="text-center max-w-md">
        <p className="text-xs font-semibold tracking-widest text-red-400 uppercase mb-3">
          Error
        </p>
        <h1 className="text-3xl font-bold mb-3">문제가 발생했습니다</h1>
        <p className="text-zinc-400 text-sm mb-2">
          예상치 못한 오류로 페이지를 표시할 수 없습니다.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-600 mb-6 font-mono">
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
