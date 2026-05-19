import { describe, it, expect } from "vitest";

import { isDataUrl } from "@/lib/storage/upload";

describe("storage upload helpers", () => {
  describe("isDataUrl", () => {
    it("returns true for base64 data URLs", () => {
      expect(isDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
      expect(isDataUrl("data:image/jpeg;base64,abcd")).toBe(true);
    });

    it("returns false for http(s) URLs", () => {
      expect(isDataUrl("https://supabase.aihubs.uk/storage/v1/x.png")).toBe(false);
      expect(isDataUrl("http://example.com/x.png")).toBe(false);
    });

    it("returns false for relative paths and empty strings", () => {
      expect(isDataUrl("/images/x.png")).toBe(false);
      expect(isDataUrl("")).toBe(false);
    });
  });
});
