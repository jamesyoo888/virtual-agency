import { describe, expect, it } from "vitest";
import {
  modelCreateSchema,
  modelPatchSchema,
  generateImageSchema,
  meshyCreateSchema,
  modelBulkStatusSchema,
} from "@/lib/api/schemas";

describe("modelCreateSchema", () => {
  it("accepts a minimal payload", () => {
    const r = modelCreateSchema.safeParse({ name: "Aria" });
    expect(r.success).toBe(true);
  });

  it("trims and rejects empty names", () => {
    const r = modelCreateSchema.safeParse({ name: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects unknown industry tags", () => {
    const r = modelCreateSchema.safeParse({
      name: "Aria",
      industry_tags: ["beauty", "not-real-tag"],
    });
    expect(r.success).toBe(false);
  });

  it("accepts wizard aliases (base_rate, personality_tone)", () => {
    const r = modelCreateSchema.safeParse({
      name: "Aria",
      base_rate: 500000,
      personality_tone: "cold and refined",
    });
    expect(r.success).toBe(true);
  });

  it("rejects negative prices", () => {
    const r = modelCreateSchema.safeParse({ name: "Aria", base_price: -100 });
    expect(r.success).toBe(false);
  });
});

describe("modelPatchSchema", () => {
  it("accepts an empty patch", () => {
    expect(modelPatchSchema.safeParse({}).success).toBe(true);
  });

  it("validates status enum", () => {
    expect(modelPatchSchema.safeParse({ status: "active" }).success).toBe(true);
    expect(modelPatchSchema.safeParse({ status: "weird" }).success).toBe(false);
  });
});

describe("generateImageSchema", () => {
  it("requires prompt", () => {
    expect(generateImageSchema.safeParse({ prompt: "" }).success).toBe(false);
    expect(generateImageSchema.safeParse({}).success).toBe(false);
  });

  it("clamps count to a sane range via validation", () => {
    expect(generateImageSchema.safeParse({ prompt: "x", count: 0 }).success).toBe(false);
    expect(generateImageSchema.safeParse({ prompt: "x", count: 100 }).success).toBe(false);
    expect(generateImageSchema.safeParse({ prompt: "x", count: 4 }).success).toBe(true);
  });
});

describe("meshyCreateSchema", () => {
  it("accepts http URLs", () => {
    expect(meshyCreateSchema.safeParse({ imageUrl: "https://x.com/a.png" }).success).toBe(true);
  });

  it("accepts data URLs", () => {
    expect(meshyCreateSchema.safeParse({ imageUrl: "data:image/png;base64,xxx" }).success).toBe(true);
  });

  it("rejects unsupported schemes", () => {
    expect(meshyCreateSchema.safeParse({ imageUrl: "ftp://x.com/a.png" }).success).toBe(false);
  });

  it("rejects missing imageUrl", () => {
    expect(meshyCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe("modelBulkStatusSchema", () => {
  it("accepts a valid bulk payload", () => {
    const r = modelBulkStatusSchema.safeParse({
      ids: ["a", "b", "c"],
      status: "active",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty ids array", () => {
    expect(
      modelBulkStatusSchema.safeParse({ ids: [], status: "active" }).success
    ).toBe(false);
  });

  it("rejects more than 100 ids", () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    expect(modelBulkStatusSchema.safeParse({ ids, status: "active" }).success).toBe(false);
  });

  it("rejects unknown status", () => {
    expect(
      modelBulkStatusSchema.safeParse({ ids: ["a"], status: "ghost" }).success
    ).toBe(false);
  });
});
