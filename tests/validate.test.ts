import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBody } from "@/lib/api/validate";

const schema = z.object({
  name: z.string().min(1),
  count: z.number().int().min(1).max(10).optional(),
});

function makeRequest(body: unknown, malformed = false): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: malformed ? "{not json" : JSON.stringify(body),
  });
}

describe("parseBody", () => {
  it("returns parsed data on a valid payload", async () => {
    const result = await parseBody(makeRequest({ name: "ok" }), schema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ name: "ok" });
  });

  it("returns 400 on malformed JSON", async () => {
    const result = await parseBody(makeRequest(null, true), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Invalid JSON body");
    }
  });

  it("returns 400 with issue list on validation failure", async () => {
    const result = await parseBody(makeRequest({ count: 99 }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Validation failed");
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues.length).toBeGreaterThan(0);
      const paths = body.issues.map((i: { path: string }) => i.path);
      // both `name` (missing) and `count` (too large) should be reported
      expect(paths).toContain("name");
      expect(paths).toContain("count");
    }
  });
});
