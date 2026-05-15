import { describe, expect, it } from "vitest";
import { videoCreateSchema, lipsyncCreateSchema } from "@/lib/api/schemas";

describe("videoCreateSchema", () => {
  it("accepts a minimal valid payload", () => {
    const r = videoCreateSchema.safeParse({
      imageUrl: "https://x.com/a.png",
      prompt: "walking",
    });
    expect(r.success).toBe(true);
  });

  it("accepts data URLs as imageUrl", () => {
    const r = videoCreateSchema.safeParse({
      imageUrl: "data:image/png;base64,xxx",
      prompt: "walking",
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-http/data imageUrl", () => {
    const r = videoCreateSchema.safeParse({
      imageUrl: "ftp://x.com/a.png",
      prompt: "x",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty prompt", () => {
    const r = videoCreateSchema.safeParse({
      imageUrl: "https://x.com/a.png",
      prompt: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid durationSec", () => {
    const r = videoCreateSchema.safeParse({
      imageUrl: "https://x.com/a.png",
      prompt: "x",
      durationSec: 7,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid aspectRatio", () => {
    const r = videoCreateSchema.safeParse({
      imageUrl: "https://x.com/a.png",
      prompt: "x",
      aspectRatio: "21:9",
    });
    expect(r.success).toBe(false);
  });

  it("accepts the known aspect/duration combos", () => {
    for (const aspectRatio of ["16:9", "9:16", "1:1"] as const) {
      for (const durationSec of [5, 10] as const) {
        const r = videoCreateSchema.safeParse({
          imageUrl: "https://x.com/a.png",
          prompt: "x",
          aspectRatio,
          durationSec,
        });
        expect(r.success).toBe(true);
      }
    }
  });
});

describe("lipsyncCreateSchema", () => {
  it("requires both URLs", () => {
    expect(
      lipsyncCreateSchema.safeParse({ videoUrl: "https://x.com/v.mp4" }).success
    ).toBe(false);
    expect(
      lipsyncCreateSchema.safeParse({ audioUrl: "https://x.com/a.mp3" }).success
    ).toBe(false);
  });

  it("accepts http and data URLs", () => {
    expect(
      lipsyncCreateSchema.safeParse({
        videoUrl: "https://x.com/v.mp4",
        audioUrl: "data:audio/mp3;base64,xxx",
      }).success
    ).toBe(true);
  });

  it("rejects unsupported schemes", () => {
    expect(
      lipsyncCreateSchema.safeParse({
        videoUrl: "ftp://x.com/v.mp4",
        audioUrl: "https://x.com/a.mp3",
      }).success
    ).toBe(false);
  });
});
