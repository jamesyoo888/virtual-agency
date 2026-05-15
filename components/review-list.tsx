import { Star } from "lucide-react";

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_company?: string | null;
}

interface Props {
  reviews: PublicReview[];
  ratingValue: number;
  ratingCount: number;
}

/**
 * Public list of approved reviews + headline aggregate. Server-rendered —
 * keeps the component free of state so it can sit in a Server Component
 * tree and be cached with the rest of the model detail page.
 */
export default function ReviewList({ reviews, ratingValue, ratingCount }: Props) {
  return (
    <div className="mt-16 pt-12 border-t border-zinc-900">
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-xl font-semibold">리뷰</h2>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <RatingStars rating={Math.round(ratingValue)} />
          <span className="font-medium text-zinc-200">{ratingValue.toFixed(1)}</span>
          <span>·</span>
          <span>{ratingCount}개의 리뷰</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-zinc-900 bg-zinc-950/40 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <RatingStars rating={r.rating} />
              <span className="text-[11px] text-zinc-600">
                {new Date(r.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            {r.comment && (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {r.comment}
              </p>
            )}
            {r.client_company && (
              <p className="text-[11px] text-zinc-500 mt-2">— {r.client_company}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
