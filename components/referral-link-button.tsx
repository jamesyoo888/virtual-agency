"use client";

import { useState } from "react";
import { Link2, Check, AlertCircle, Users } from "lucide-react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; url: string; justCopied: boolean }
  | { kind: "error"; message: string };

export default function ReferralLinkButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function mint() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/client/referral", { method: "POST" });
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
      await navigator.clipboard.writeText(url).catch(() => undefined);
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
      // ignore
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
          <Users className="w-3 h-3" /> 내 추천 링크
        </p>
        <div className="flex items-stretch gap-1">
          <input
            readOnly
            value={state.url}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 text-xs bg-zinc-950 border border-zinc-800 rounded-l-md px-2 py-1.5 text-zinc-200 font-mono"
          />
          <button
            type="button"
            onClick={() => copyAgain(state.url)}
            className="inline-flex items-center gap-1.5 text-xs bg-white text-black rounded-r-md px-3 py-1.5 hover:bg-zinc-200"
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
        <p className="text-[10px] text-zinc-600 mt-2">
          이 링크로 가입·문의한 광고주가 Inbox 에 utm_source=referral 로 기록됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
        <Users className="w-3 h-3" /> 다른 광고주에게 추천하기
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={mint}
          disabled={state.kind === "loading"}
          className="inline-flex items-center gap-1.5 text-xs bg-white text-black rounded-md px-3 py-1.5 hover:bg-zinc-200 disabled:opacity-60"
        >
          <Link2 className="w-3 h-3" />
          {state.kind === "loading" ? "생성 중…" : "내 추천 링크 만들기"}
        </button>
        {state.kind === "error" && (
          <span className="inline-flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="w-3 h-3" /> {state.message}
          </span>
        )}
      </div>
    </div>
  );
}
