import type { Review, ReviewAggregate } from "@/types";

/**
 * Compute the public-facing aggregate (mean rating + count) for a list of
 * approved reviews. Returns `null` when there are no reviews so callers can
 * suppress the "no reviews yet" widget without sprinkling defensive checks.
 *
 * Rounds the mean to one decimal place — anything more precise would be
 * spurious given the 1-5 integer rating scale, and Google's schema.org
 * aggregateRating validator is happy with a single decimal.
 */
export function aggregateApproved(reviews: Pick<Review, "rating" | "status">[]):
  | ReviewAggregate
  | null {
  const approved = reviews.filter((r) => r.status === "approved");
  if (approved.length === 0) return null;
  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  return {
    rating_value: Math.round((sum / approved.length) * 10) / 10,
    rating_count: approved.length,
  };
}

/** Histogram of how many approved reviews fall on each 1-5 bucket. */
export function ratingHistogram(reviews: Pick<Review, "rating" | "status">[]): number[] {
  const buckets = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.status !== "approved") continue;
    if (r.rating >= 1 && r.rating <= 5) {
      buckets[r.rating - 1]++;
    }
  }
  return buckets;
}
