import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal in-memory sessionStorage polyfill so we don't drag in jsdom for a
// 100-line test. Setting up before importing the module under test ensures
// `typeof window` checks in attribution.ts still pass.
class MemoryStorage {
  private store: Record<string, string> = {};
  getItem(k: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null;
  }
  setItem(k: string, v: string): void {
    this.store[k] = String(v);
  }
  removeItem(k: string): void {
    delete this.store[k];
  }
  clear(): void {
    this.store = {};
  }
}

const storage = new MemoryStorage();
// Promote the polyfill onto globalThis so `typeof window !== "undefined"`
// short-circuits inside the SUT and the storage shim is used.
(globalThis as { window?: object }).window = {};
(globalThis as { sessionStorage?: MemoryStorage }).sessionStorage = storage;

const {
  snapshotAttribution,
  readAttribution,
  _resetAttributionForTests,
  ATTRIBUTION_STORAGE_KEY,
} = await import("@/lib/attribution");

describe("attribution snapshot", () => {
  beforeEach(() => {
    storage.clear();
    _resetAttributionForTests();
  });

  it("returns empty fields when nothing has been captured", () => {
    const a = readAttribution();
    expect(a).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referrer: null,
    });
  });

  it("captures utm parameters and an external referrer on first call", () => {
    snapshotAttribution({
      search: "?utm_source=instagram&utm_medium=ad&utm_campaign=spring",
      referrer: "https://www.instagram.com/some/post",
      origin: "https://example.com",
    });
    const a = readAttribution();
    expect(a.utm_source).toBe("instagram");
    expect(a.utm_medium).toBe("ad");
    expect(a.utm_campaign).toBe("spring");
    expect(a.referrer).toBe("https://www.instagram.com/some/post");
  });

  it("ignores internal referrers", () => {
    snapshotAttribution({
      search: "?utm_source=newsletter",
      referrer: "https://example.com/blog/post",
      origin: "https://example.com",
    });
    const a = readAttribution();
    expect(a.utm_source).toBe("newsletter");
    expect(a.referrer).toBeNull();
  });

  it("does not persist anything when no utm or external referrer", () => {
    snapshotAttribution({
      search: "?other=1",
      referrer: "",
      origin: "https://example.com",
    });
    expect(storage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
  });

  it("is idempotent — second call does not overwrite the first", () => {
    snapshotAttribution({
      search: "?utm_source=instagram",
      referrer: "",
      origin: "https://example.com",
    });
    snapshotAttribution({
      search: "?utm_source=twitter",
      referrer: "",
      origin: "https://example.com",
    });
    expect(readAttribution().utm_source).toBe("instagram");
  });

  it("clamps oversized values to schema limits", () => {
    const long = "x".repeat(1000);
    snapshotAttribution({
      search: `?utm_source=${long}&utm_campaign=${long}`,
      referrer: `https://other.com/${long}`,
      origin: "https://example.com",
    });
    const a = readAttribution();
    expect(a.utm_source!.length).toBeLessThanOrEqual(120);
    expect(a.utm_campaign!.length).toBeLessThanOrEqual(200);
    expect(a.referrer!.length).toBeLessThanOrEqual(500);
  });

  it("survives malformed sessionStorage values", () => {
    storage.setItem(ATTRIBUTION_STORAGE_KEY, "{not json");
    expect(() => readAttribution()).not.toThrow();
    const a = readAttribution();
    expect(a.utm_source).toBeNull();
  });
});

describe("snapshotAttribution silently fails when sessionStorage is unavailable", () => {
  it("does not throw if storage access raises", () => {
    const spy = vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() =>
      snapshotAttribution({ search: "?utm_source=x", referrer: "", origin: "https://e.com" })
    ).not.toThrow();
    spy.mockRestore();
  });
});
