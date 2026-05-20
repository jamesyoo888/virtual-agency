import { describe, it, expect } from "vitest";
import { isImageUrl, isVideoUrl } from "@/lib/media/type";

describe("isVideoUrl", () => {
  it("matches mp4/webm/mov", () => {
    expect(isVideoUrl("https://x.com/a.mp4")).toBe(true);
    expect(isVideoUrl("https://x.com/a.webm")).toBe(true);
    expect(isVideoUrl("https://x.com/folder/clip.MOV")).toBe(true);
  });
  it("rejects image extensions", () => {
    expect(isVideoUrl("https://x.com/photo.jpg")).toBe(false);
    expect(isVideoUrl("https://x.com/photo.PNG")).toBe(false);
  });
  it("handles query strings", () => {
    expect(isVideoUrl("https://x.com/clip.mp4?token=abc&exp=1")).toBe(true);
  });
  it("rejects missing extension", () => {
    expect(isVideoUrl("https://x.com/no-ext")).toBe(false);
  });
});

describe("isImageUrl", () => {
  it("matches jpg/png/webp/avif", () => {
    expect(isImageUrl("https://x.com/a.jpg")).toBe(true);
    expect(isImageUrl("https://x.com/a.PNG")).toBe(true);
    expect(isImageUrl("https://x.com/a.webp")).toBe(true);
    expect(isImageUrl("https://x.com/a.avif")).toBe(true);
  });
  it("rejects video extensions", () => {
    expect(isImageUrl("https://x.com/a.mp4")).toBe(false);
  });
});
