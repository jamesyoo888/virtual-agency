"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  /** Pre-rendered plain-text summary the button copies on click. */
  text: string;
}

/**
 * Tiny clipboard button — admin clicks once, paste-ready summary lands
 * in the clipboard. No tooltips/popovers — the icon + state swap is the
 * affordance. Recovers gracefully when navigator.clipboard isn't
 * available (older browsers, insecure context).
 */
export default function AdminCopySummary({ text }: Props) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");

  async function onClick() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts: textarea + execCommand. Modern
        // browsers warn on this path but it still works.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setState("ok");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("err");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
        state === "ok"
          ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
          : state === "err"
          ? "border-rose-500/50 text-rose-300 bg-rose-500/10"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
      }`}
      title="오늘의 요약 클립보드 복사"
    >
      {state === "ok" ? (
        <Check className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {state === "ok" ? "복사됨" : state === "err" ? "실패" : "요약 복사"}
    </button>
  );
}
