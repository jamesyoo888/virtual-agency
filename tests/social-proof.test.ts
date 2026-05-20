import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({ SUPABASE_CONFIGURED: true }));

const builders = {
  delivered: () => ({ count: 5, error: null }),
  models: () => ({ count: 12, error: null }),
  reviewsData: [] as { rating: number }[],
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue(builders.delivered()),
          }),
        };
      }
      if (table === "models") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue(builders.models()),
          }),
        };
      }
      // reviews
      return {
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: builders.reviewsData, error: null }),
        }),
      };
    },
  }),
}));

const { loadSocialProof } = await import("@/lib/social-proof");

describe("loadSocialProof", () => {
  beforeEach(() => {
    builders.reviewsData = [];
  });

  it("returns counts and a null average when there are no approved reviews", async () => {
    const p = await loadSocialProof();
    expect(p.deliveredCount).toBe(5);
    expect(p.activeModels).toBe(12);
    expect(p.averageRating).toBeNull();
    expect(p.reviewCount).toBe(0);
  });

  it("computes a one-decimal average across approved reviews", async () => {
    builders.reviewsData = [{ rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 3 }];
    const p = await loadSocialProof();
    expect(p.averageRating).toBe(4.0);
    expect(p.reviewCount).toBe(4);
  });

  it("rounds the average to one decimal", async () => {
    builders.reviewsData = [{ rating: 5 }, { rating: 4 }, { rating: 4 }];
    const p = await loadSocialProof();
    // 13/3 = 4.333... → 4.3
    expect(p.averageRating).toBe(4.3);
  });

  it("ignores non-finite ratings defensively", async () => {
    builders.reviewsData = [
      { rating: 5 },
      { rating: NaN as unknown as number },
      { rating: 3 },
    ];
    const p = await loadSocialProof();
    expect(p.reviewCount).toBe(2);
    expect(p.averageRating).toBe(4.0);
  });
});
