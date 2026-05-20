"use client";

import { useState } from "react";
import { Link2, Check, AlertCircle } from "lucide-react";

interface Props {
  projectId: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; url: string; justCopied: boolean }
  | { kind: "error"; message: string };

export default function QuoteShareButton({ projectId }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function mint() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/client/quote/${projectId}/share`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed" }));
        setState({
          kind: "error",
          message: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const data = (await res.json()) as { path: string };
      const url = `${window.location.origin}${data.path}`;
      await navigator.clipboard.writeText(url).catch(() => {
        // Some browsers (older mobile) require a click-context for the
        // clipboard API. We swallow the error and still show the URL so the
        // user can copy it manually.
      });
      setState({ kind: "ready", url, justCopied: true });
      setTimeout(() => {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, justCopied: false } : prev
        );
      }, 2400);
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "네트워크 오류",
      });
    }
  }

  async function copyAgain(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setState({ kind: "ready", url, justCopied: true });
      setTimeout(() => {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, justCopied: false } : prev
        );
      }, 2400);
    } catch {
      // Selecting the input lets the user copy manually as fallback.
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="inline-flex items-stretch gap-1 print:hidden">
        <input
          readOnly
          value={state.url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-72 max-w-full text-xs bg-white border border-zinc-300 rounded-l-md px-2 py-1.5 text-zinc-700 font-mono"
        />
        <button
          type="button"
          onClick={() => copyAgain(state.url)}
          className="inline-flex items-center gap-1.5 text-xs bg-zinc-900 text-white rounded-r-md px-3 py-1.5 hover:bg-zinc-700"
        >
          {state.justCopied ? (
            <>
              <Check className="w-3 h-3" /> 복사됨
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3" /> 복사
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={mint}
        disabled={state.kind === "loading"}
        className="inline-flex items-center gap-1.5 text-xs border border-zinc-300 rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
      >
        <Link2 className="w-3 h-3" />
        {state.kind === "loading" ? "생성 중…" : "공유 링크 만들기"}
      </button>
      {state.kind === "error" && (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" /> {state.message}
        </span>
      )}
    </div>
  );
}
