"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface Props {
  modelId: string;
  initial: boolean;
  /** When true, the visitor isn't signed in and we link to /login instead. */
  unauthenticated?: boolean;
  loginNext?: string;
  className?: string;
}

/**
 * Bookmark toggle for an individual model. POSTs/DELETEs to
 * `/api/client/bookmarks` and flips an optimistic local state. Anonymous
 * visitors see the same icon but clicking routes them through login first.
 */
export default function BookmarkButton({
  modelId,
  initial,
  unauthenticated,
  loginNext,
  className,
}: Props) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (unauthenticated) {
      const url = loginNext ? `/login?next=${encodeURIComponent(loginNext)}` : "/login";
      window.location.href = url;
      return;
    }
    setError(null);
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch("/api/client/bookmarks", {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model_id: modelId }),
        });
        if (!res.ok && res.status !== 201) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        setBookmarked(!next); // roll back
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  const Icon = bookmarked ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "북마크 제거" : "북마크 추가"}
      className={
        className ??
        `inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
          bookmarked
            ? "bg-white text-black border-white"
            : "bg-transparent text-zinc-300 border-zinc-700 hover:border-zinc-500"
        } disabled:opacity-60`
      }
      title={
        unauthenticated
          ? "로그인 후 북마크할 수 있습니다"
          : bookmarked
            ? "북마크 제거"
            : "북마크 추가"
      }
    >
      <Icon className="w-4 h-4" />
      {bookmarked ? "북마크됨" : "북마크"}
      {error && <span className="sr-only">{error}</span>}
    </button>
  );
}
