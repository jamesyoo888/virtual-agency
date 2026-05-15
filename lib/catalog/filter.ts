import type { Model } from "@/types";

export type CatalogSort = "popular" | "recent" | "price-asc" | "price-desc" | "name";

export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "popular", label: "인기순" },
  { value: "recent", label: "최신순" },
  { value: "price-asc", label: "낮은 가격" },
  { value: "price-desc", label: "높은 가격" },
  { value: "name", label: "이름순" },
];

export interface CatalogQueryParams {
  q?: string;
  industry?: string;
  genre?: string;
  mood?: string;
  price_max?: string;
  exclusive?: string;
  sort?: string;
  page?: string;
  view?: string;
}

export const CATALOG_PAGE_SIZE = 24;

export function normalizeSort(s: string | undefined): CatalogSort {
  return (SORT_OPTIONS.find((o) => o.value === s)?.value ?? "popular");
}

export function normalizePage(s: string | undefined): number {
  const n = Number.parseInt(s ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = CATALOG_PAGE_SIZE
): PaginatedResult<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: clamped,
    pageSize,
    totalCount,
    totalPages,
  };
}

function sortModels(models: Model[], sort: CatalogSort): Model[] {
  const arr = [...models];
  switch (sort) {
    case "recent":
      return arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "price-asc":
      return arr.sort(
        (a, b) => (a.base_price ?? Infinity) - (b.base_price ?? Infinity)
      );
    case "price-desc":
      return arr.sort(
        (a, b) => (b.base_price ?? -Infinity) - (a.base_price ?? -Infinity)
      );
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    case "popular":
    default:
      return arr.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
  }
}

/**
 * In-memory equivalent of the Supabase catalog query — used in the dev
 * fallback path and shared with tests. Should match the semantics of the
 * server-side ilike/contains filters as closely as possible.
 */
export function filterModelsForCatalog(
  models: Model[],
  params: CatalogQueryParams
): Model[] {
  const filtered = models
    .filter((m) => m.status === "active")
    .filter((m) => {
      if (params.q) {
        const q = params.q.toLowerCase();
        if (!(m.name ?? "").toLowerCase().includes(q)) return false;
      }
      if (params.industry && !m.industry_tags?.includes(params.industry as never)) {
        return false;
      }
      if (params.genre && !m.genre_tags?.includes(params.genre as never)) {
        return false;
      }
      if (params.mood && !m.mood_tags?.includes(params.mood as never)) {
        return false;
      }
      if (params.price_max) {
        const max = Number.parseInt(params.price_max, 10);
        if (Number.isFinite(max) && (m.base_price ?? Infinity) > max) return false;
      }
      if (params.exclusive === "true" && !m.is_exclusive_available) return false;
      return true;
    });

  return sortModels(filtered, normalizeSort(params.sort));
}
