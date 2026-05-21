import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({ SUPABASE_CONFIGURED: true }));

interface Fixtures {
  deliveredCount: number;
  modelsCount: number;
  reviewsData: { rating: number }[];
  recentProjects: { id: string; created_at: string }[];
  recentHistory: { project_id: string; changed_at: string }[];
}

const fixtures: Fixtures = {
  deliveredCount: 5,
  modelsCount: 12,
  reviewsData: [],
  recentProjects: [],
  recentHistory: [],
};

// Chainable query builder mock. Each terminal method (.then-able via the
// `then` hook) resolves to a shape the implementation expects. We branch on
// table name so we can serve five different queries from one factory.
function buildChain(table: string) {
  const ctx: {
    table: string;
    isCount: boolean;
    filters: Record<string, unknown>;
  } = { table, isCount: false, filters: {} };

  const chain = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) ctx.isCount = true;
      return chain;
    },
    eq: (col: string, val: unknown) => {
      ctx.filters[col] = val;
      // The reviews / models count queries terminate here — return a
      // thenable so `await` resolves to the expected shape.
      return makeResolvable();
    },
    gte: () => chain,
    neq: () => chain,
    is: () => chain,
    in: () => chain,
    gt: () => chain,
    order: () => chain,
    limit: () => makeResolvable(),
    single: () => makeResolvable(),
  };

  function makeResolvable() {
    return {
      then: (resolve: (v: unknown) => void) => {
        if (ctx.table === "projects" && ctx.isCount) {
          resolve({ count: fixtures.deliveredCount, error: null });
        } else if (ctx.table === "models" && ctx.isCount) {
          resolve({ count: fixtures.modelsCount, error: null });
        } else if (ctx.table === "reviews") {
          resolve({ data: fixtures.reviewsData, error: null });
        } else if (ctx.table === "projects") {
          resolve({ data: fixtures.recentProjects, error: null });
        } else if (ctx.table === "project_status_history") {
          resolve({ data: fixtures.recentHistory, error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
      // The chain object spreads here so subsequent calls (.eq, .gte) still
      // work after a terminal method — required because the impl uses .eq
      // mid-chain rather than at the end for some queries.
      ...chain,
    };
  }

  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => buildChain(table),
  }),
}));

const { loadSocialProof } = await import("@/lib/social-proof");

describe("loadSocialProof", () => {
  beforeEach(() => {
    fixtures.reviewsData = [];
    fixtures.recentProjects = [];
    fixtures.recentHistory = [];
  });

  it("returns counts and a null average when there are no approved reviews", async () => {
    const p = await loadSocialProof();
    expect(p.deliveredCount).toBe(5);
    expect(p.activeModels).toBe(12);
    expect(p.averageRating).toBeNull();
    expect(p.reviewCount).toBe(0);
    expect(p.medianResponseHours).toBeNull();
  });

  it("computes a one-decimal average across approved reviews", async () => {
    fixtures.reviewsData = [{ rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 3 }];
    const p = await loadSocialProof();
    expect(p.averageRating).toBe(4.0);
    expect(p.reviewCount).toBe(4);
  });

  it("rounds the average to one decimal", async () => {
    fixtures.reviewsData = [{ rating: 5 }, { rating: 4 }, { rating: 4 }];
    const p = await loadSocialProof();
    expect(p.averageRating).toBe(4.3);
  });

  it("ignores non-finite ratings defensively", async () => {
    fixtures.reviewsData = [
      { rating: 5 },
      { rating: NaN as unknown as number },
      { rating: 3 },
    ];
    const p = await loadSocialProof();
    expect(p.reviewCount).toBe(2);
    expect(p.averageRating).toBe(4.0);
  });

  it("median response time requires at least 3 responses", async () => {
    fixtures.recentProjects = [
      { id: "a", created_at: "2026-05-20T10:00:00Z" },
      { id: "b", created_at: "2026-05-20T10:00:00Z" },
    ];
    fixtures.recentHistory = [
      { project_id: "a", changed_at: "2026-05-20T11:00:00Z" },
      { project_id: "b", changed_at: "2026-05-20T13:00:00Z" },
    ];
    const p = await loadSocialProof();
    expect(p.medianResponseHours).toBeNull();
  });

  it("computes median response in hours when enough data", async () => {
    fixtures.recentProjects = [
      { id: "a", created_at: "2026-05-20T10:00:00Z" },
      { id: "b", created_at: "2026-05-20T10:00:00Z" },
      { id: "c", created_at: "2026-05-20T10:00:00Z" },
    ];
    fixtures.recentHistory = [
      { project_id: "a", changed_at: "2026-05-20T11:00:00Z" }, // 1h
      { project_id: "b", changed_at: "2026-05-20T12:00:00Z" }, // 2h
      { project_id: "c", changed_at: "2026-05-20T13:00:00Z" }, // 3h
    ];
    const p = await loadSocialProof();
    expect(p.medianResponseHours).toBe(2);
  });
});
