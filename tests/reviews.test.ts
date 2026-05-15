import { describe, it, expect } from "vitest";

import { aggregateApproved, ratingHistogram } from "@/lib/reviews";
import { reviewCreateSchema, reviewModerateSchema } from "@/lib/api/schemas";

describe("reviews / aggregateApproved", () => {
  it("returns null when there are no approved reviews", () => {
    expect(aggregateApproved([])).toBeNull();
    expect(
      aggregateApproved([{ rating: 5, status: "pending" }])
    ).toBeNull();
    expect(
      aggregateApproved([
        { rating: 1, status: "rejected" },
        { rating: 5, status: "pending" },
      ])
    ).toBeNull();
  });

  it("averages approved reviews and counts them", () => {
    const r = aggregateApproved([
      { rating: 5, status: "approved" },
      { rating: 4, status: "approved" },
      { rating: 1, status: "rejected" }, // ignored
      { rating: 3, status: "approved" },
    ]);
    expect(r).toEqual({ rating_value: 4, rating_count: 3 });
  });

  it("rounds the mean to one decimal place", () => {
    const r = aggregateApproved([
      { rating: 5, status: "approved" },
      { rating: 4, status: "approved" },
      { rating: 4, status: "approved" },
    ]);
    expect(r?.rating_value).toBe(4.3);
  });
});

describe("reviews / ratingHistogram", () => {
  it("counts approved per bucket and ignores other statuses", () => {
    const h = ratingHistogram([
      { rating: 5, status: "approved" },
      { rating: 5, status: "approved" },
      { rating: 4, status: "approved" },
      { rating: 1, status: "rejected" },
      { rating: 3, status: "pending" },
    ]);
    expect(h).toEqual([0, 0, 0, 1, 2]);
  });
});

describe("reviews / schemas", () => {
  it("reviewCreateSchema enforces 1-5 rating and string project_id", () => {
    expect(
      reviewCreateSchema.safeParse({ project_id: "p1", rating: 5 }).success
    ).toBe(true);
    expect(reviewCreateSchema.safeParse({ project_id: "p1", rating: 0 }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ project_id: "p1", rating: 6 }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ project_id: "", rating: 3 }).success).toBe(false);
    expect(
      reviewCreateSchema.safeParse({
        project_id: "p1",
        rating: 3.5,
      }).success
    ).toBe(false); // integer only
  });

  it("reviewCreateSchema caps comment length at 2000 chars", () => {
    const long = "x".repeat(2001);
    expect(
      reviewCreateSchema.safeParse({ project_id: "p1", rating: 5, comment: long }).success
    ).toBe(false);
    expect(
      reviewCreateSchema.safeParse({
        project_id: "p1",
        rating: 5,
        comment: "x".repeat(2000),
      }).success
    ).toBe(true);
  });

  it("reviewModerateSchema only accepts approved/rejected", () => {
    expect(reviewModerateSchema.safeParse({ status: "approved" }).success).toBe(true);
    expect(reviewModerateSchema.safeParse({ status: "rejected" }).success).toBe(true);
    expect(reviewModerateSchema.safeParse({ status: "pending" }).success).toBe(false);
  });
});
