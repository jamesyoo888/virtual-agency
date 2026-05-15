"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/toast";

interface Props {
  projectId: string;
  projectTitle: string;
  /**
   * When `existingStatus` is provided, the form is replaced with a static
   * notice — clients should not re-submit a review that's already in the
   * moderation queue or approved.
   */
  existingStatus?: "pending" | "approved" | "rejected" | null;
}

const STATUS_NOTE: Record<string, string> = {
  pending: "리뷰가 검토 대기 중입니다.",
  approved: "이미 승인된 리뷰가 있습니다. 감사합니다.",
  rejected: "이전 리뷰는 거부되었습니다. 추가 문의는 운영자에게 연락 주세요.",
};

/**
 * Compact inline review form. Clients land here from their dashboard once a
 * project hits `delivered`. Posting goes through `/api/reviews`, which
 * inserts with status='pending' so admin moderation kicks in.
 */
export default function ReviewSubmit({
  projectId,
  projectTitle,
  existingStatus,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (existingStatus) {
    return (
      <p className="text-xs text-zinc-500 inline-flex items-center gap-1.5">
        <Check className="w-3 h-3" />
        {STATUS_NOTE[existingStatus] ?? "리뷰가 접수되었습니다."}
      </p>
    );
  }

  function submit() {
    if (rating < 1) {
      setError("별점을 선택해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            rating,
            comment: comment.trim() || null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        toast.success("리뷰가 등록되었습니다. 검토 후 공개됩니다.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "전송 실패");
      }
    });
  }

  const display = hover || rating;

  return (
    <div className="rounded-lg border border-zinc-800 p-3 bg-zinc-950/40">
      <p className="text-xs text-zinc-500 mb-2">
        &ldquo;{projectTitle}&rdquo; 작업에 대한 리뷰를 남겨주세요.
      </p>
      <div className="flex items-center gap-1 mb-2" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i}점`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="p-0.5 cursor-pointer"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                i <= display ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs text-zinc-500 ml-1">{rating}.0</span>
        )}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="간단한 후기 (옵션)"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 resize-none"
      />
      <div className="flex items-center justify-between gap-2 mt-2">
        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <span className="text-[10px] text-zinc-600">검토 후 공개됩니다.</span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-black text-xs font-medium hover:bg-zinc-200 disabled:opacity-50"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          리뷰 등록
        </button>
      </div>
    </div>
  );
}
