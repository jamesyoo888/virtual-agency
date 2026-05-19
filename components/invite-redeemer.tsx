"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const RESULT_MESSAGES: Record<string, { tone: "ok" | "warn" | "danger"; text: string }> = {
  promoted: { tone: "ok", text: "관리자 권한이 부여되었습니다. 잠시 후 관리자 페이지로 이동합니다." },
  already_admin: { tone: "ok", text: "이미 관리자이며, 토큰이 사용 처리되었습니다." },
  token_used: { tone: "warn", text: "이 토큰은 이미 다른 사용자가 사용했습니다." },
  token_expired: { tone: "warn", text: "만료된 토큰입니다. 새 토큰을 요청하세요." },
  invalid_token: { tone: "danger", text: "유효하지 않은 토큰입니다." },
};

export default function InviteRedeemer({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<keyof typeof RESULT_MESSAGES | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRedeem() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const result = body.result as string;
      setOutcome(result in RESULT_MESSAGES ? (result as keyof typeof RESULT_MESSAGES) : "invalid_token");
      if (result === "promoted" || result === "already_admin") {
        // Give the user a beat to read the success message before bouncing.
        setTimeout(() => {
          router.push("/admin/models");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setPending(false);
    }
  }

  if (outcome) {
    const msg = RESULT_MESSAGES[outcome];
    const toneClass =
      msg.tone === "ok"
        ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
        : msg.tone === "warn"
          ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/30"
          : "text-red-300 bg-red-500/10 border-red-500/30";
    return (
      <div className={`rounded border px-3 py-2 text-sm ${toneClass}`}>
        {msg.text}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleRedeem}
        disabled={pending}
        className="w-full bg-white text-black hover:bg-zinc-200"
      >
        {pending ? "처리 중..." : "관리자 권한 받기"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
