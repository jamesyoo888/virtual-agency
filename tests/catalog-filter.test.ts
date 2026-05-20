import { describe, expect, it } from "vitest";
import {
  filterModelsForCatalog,
  normalizePage,
  paginate,
  CATALOG_PAGE_SIZE,
} from "@/lib/catalog/filter";
import type { Model } from "@/types";

function model(partial: Partial<Model>): Model {
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? "Test",
    slug: partial.slug ?? "test",
    debut_date: null,
    bio: null,
    personality: null,
    industry_tags: [],
    genre_tags: [],
    mood_tags: [],
    instagram_handle: null,
    follower_count: 0,
    base_price: null,
    exclusive_price: null,
    is_exclusive_available: true,
    status: "active",
    concept_image: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  } as Model;
}

describe("filterModelsForCatalog", () => {
  const aria = model({
    name: "Aria",
    industry_tags: ["beauty"],
    genre_tags: ["ad"],
    mood_tags: ["cold"],
    follower_count: 100,
    base_price: 1_000_000,
    is_exclusive_available: true,
  });
  const luna = model({
    name: "Luna",
    industry_tags: ["tech"],
    genre_tags: ["film"],
    mood_tags: ["warm"],
    follower_count: 500,
    base_price: 500_000,
    is_exclusive_available: false,
  });
  const draft = model({ name: "DraftOnly", status: "draft" });

  const all = [aria, luna, draft];

  it("excludes non-active models", () => {
    const r = filterModelsForCatalog(all, {});
    expect(r.find((m) => m.name === "DraftOnly")).toBeUndefined();
  });

  it("sorts by follower_count descending", () => {
    const r = filterModelsForCatalog(all, {});
    expect(r[0].name).toBe("Luna");
    expect(r[1].name).toBe("Aria");
  });

  it("name search is case-insensitive substring", () => {
    expect(filterModelsForCatalog(all, { q: "ar" }).map((m) => m.name)).toEqual(["Aria"]);
    expect(filterModelsForCatalog(all, { q: "LUNA" }).map((m) => m.name)).toEqual(["Luna"]);
  });

  it("search also matches bio text", () => {
    const ada = model({ name: "Ada", bio: "오로라처럼 빛나는 메이크업 모델" });
    const ben = model({ name: "Ben", bio: "tech keynote 무대용" });
    expect(
      filterModelsForCatalog([ada, ben], { q: "오로라" }).map((m) => m.name)
    ).toEqual(["Ada"]);
    expect(
      filterModelsForCatalog([ada, ben], { q: "keynote" }).map((m) => m.name)
    ).toEqual(["Ben"]);
  });

  it("industry filter", () => {
    expect(filterModelsForCatalog(all, { industry: "beauty" }).map((m) => m.name)).toEqual(["Aria"]);
    expect(filterModelsForCatalog(all, { industry: "tech" }).map((m) => m.name)).toEqual(["Luna"]);
  });

  it("genre and mood filters", () => {
    expect(filterModelsForCatalog(all, { genre: "film" })[0].name).toBe("Luna");
    expect(filterModelsForCatalog(all, { mood: "cold" })[0].name).toBe("Aria");
  });

  it("price_max is inclusive upper bound", () => {
    expect(filterModelsForCatalog(all, { price_max: "500000" }).map((m) => m.name)).toEqual([
      "Luna",
    ]);
    expect(
      filterModelsForCatalog(all, { price_max: "1000000" }).map((m) => m.name)
    ).toEqual(["Luna", "Aria"]);
  });

  it("exclusive=true restricts to models with exclusive availability", () => {
    expect(filterModelsForCatalog(all, { exclusive: "true" }).map((m) => m.name)).toEqual([
      "Aria",
    ]);
  });

  it("ignores invalid price_max", () => {
    expect(filterModelsForCatalog(all, { price_max: "not-a-number" })).toHaveLength(2);
  });
});

describe("normalizePage", () => {
  it("defaults to 1 for missing / invalid / sub-1 input", () => {
    expect(normalizePage(undefined)).toBe(1);
    expect(normalizePage("")).toBe(1);
    expect(normalizePage("abc")).toBe(1);
    expect(normalizePage("0")).toBe(1);
    expect(normalizePage("-5")).toBe(1);
  });

  it("returns the parsed page when valid", () => {
    expect(normalizePage("1")).toBe(1);
    expect(normalizePage("3")).toBe(3);
    expect(normalizePage("99")).toBe(99);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 50 }, (_, i) => i + 1);

  it("returns the correct slice for page 1", () => {
    const r = paginate(items, 1, 10);
    expect(r.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.page).toBe(1);
    expect(r.totalCount).toBe(50);
    expect(r.totalPages).toBe(5);
  });

  it("returns the correct slice for a middle page", () => {
    const r = paginate(items, 3, 10);
    expect(r.items).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    expect(r.page).toBe(3);
  });

  it("clamps page above totalPages back to last page", () => {
    const r = paginate(items, 99, 10);
    expect(r.page).toBe(5);
    expect(r.items).toEqual([41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
  });

  it("handles empty arrays as 1 total page with no items", () => {
    const r = paginate<number>([], 1, 10);
    expect(r.items).toEqual([]);
    expect(r.totalCount).toBe(0);
    expect(r.totalPages).toBe(1);
    expect(r.page).toBe(1);
  });

  it("default page size matches CATALOG_PAGE_SIZE", () => {
    const big = Array.from({ length: CATALOG_PAGE_SIZE * 2 + 3 }, (_, i) => i);
    const r = paginate(big, 1);
    expect(r.items).toHaveLength(CATALOG_PAGE_SIZE);
    expect(r.pageSize).toBe(CATALOG_PAGE_SIZE);
    expect(r.totalPages).toBe(3);
  });
});
