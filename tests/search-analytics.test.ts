import { describe, it, expect } from "vitest";
import { sanitizeQuery, aggregateSearchRows } from "@/lib/analytics/search-log";

describe("sanitizeQuery", () => {
  it("trims and lowercases", () => {
    expect(sanitizeQuery("  Beauty Model  ")).toBe("beauty model");
  });

  it("returns null for empty/blank input", () => {
    expect(sanitizeQuery(null)).toBeNull();
    expect(sanitizeQuery("")).toBeNull();
    expect(sanitizeQuery("    ")).toBeNull();
  });

  it("caps query length to 80 chars", () => {
    const long = "x".repeat(200);
    const out = sanitizeQuery(long);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(80);
  });
});

describe("aggregateSearchRows", () => {
  it("buckets queries by lowercase string and sorts top by count", () => {
    const out = aggregateSearchRows(
      [
        { q: "beauty", results: 12 },
        { q: "beauty", results: 12 },
        { q: "beauty", results: 12 },
        { q: "luxury", results: 5 },
        { q: "luxury", results: 5 },
        { q: "k-pop", results: 0 },
      ],
      5
    );
    expect(out.totalQueries).toBe(6);
    expect(out.top[0].q).toBe("beauty");
    expect(out.top[0].count).toBe(3);
    expect(out.top[1].q).toBe("luxury");
  });

  it("zero-result bucket isolates queries with at least one 0-result hit", () => {
    const out = aggregateSearchRows(
      [
        { q: "beauty", results: 5 },
        { q: "k-pop", results: 0 },
        { q: "k-pop", results: 0 },
        { q: "k-pop", results: 1 },
      ],
      5
    );
    expect(out.zero.find((r) => r.q === "beauty")).toBeUndefined();
    const kpop = out.zero.find((r) => r.q === "k-pop");
    expect(kpop).toBeDefined();
    expect(kpop!.zeroResultCount).toBe(2);
    expect(kpop!.count).toBe(3);
  });

  it("avgResults is the per-query mean rounded to 1 decimal", () => {
    const out = aggregateSearchRows(
      [
        { q: "x", results: 1 },
        { q: "x", results: 2 },
        { q: "x", results: 4 },
      ],
      5
    );
    expect(out.top[0].avgResults).toBeCloseTo(2.3, 1);
  });

  it("skips rows with empty q", () => {
    const out = aggregateSearchRows(
      [
        { q: "", results: 5 },
        { q: "beauty", results: 5 },
      ],
      5
    );
    expect(out.top).toHaveLength(1);
    expect(out.top[0].q).toBe("beauty");
  });

  it("limit caps top + zero outputs", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      q: `q${i}`,
      results: i % 3 === 0 ? 0 : 5,
    }));
    const out = aggregateSearchRows(rows, 10);
    expect(out.top.length).toBeLessThanOrEqual(10);
    expect(out.zero.length).toBeLessThanOrEqual(10);
  });
});
