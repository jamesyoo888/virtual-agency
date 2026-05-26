import { describe, it, expect } from "vitest";

/**
 * Smoke tests for the agent application schema. We can't easily test the
 * route handler end-to-end without a full Supabase mock, but the input
 * validation contract is worth pinning here so a schema change can't quietly
 * break the signup form.
 *
 * The schema is duplicated from app/api/agents/apply/route.ts. Keep them in
 * sync — there is no shared export because the route inlines the schema for
 * locality.
 */

import { z } from "zod";

const schema = z.object({
  agent_company: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional(),
});

describe("agent apply schema", () => {
  it("requires agent_company", () => {
    const r = schema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("trims whitespace and rejects empty after trim", () => {
    const r = schema.safeParse({ agent_company: "   " });
    expect(r.success).toBe(false);
  });

  it("accepts a normal application", () => {
    const r = schema.safeParse({
      agent_company: "ACME Creative",
      notes: "We cover K-beauty US and EU launches.",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.agent_company).toBe("ACME Creative");
      expect(r.data.notes).toContain("K-beauty");
    }
  });

  it("treats notes as optional", () => {
    const r = schema.safeParse({ agent_company: "X" });
    expect(r.success).toBe(true);
  });

  it("caps agent_company at 120 chars", () => {
    const r = schema.safeParse({ agent_company: "a".repeat(121) });
    expect(r.success).toBe(false);
  });

  it("caps notes at 2000 chars", () => {
    const r = schema.safeParse({
      agent_company: "X",
      notes: "a".repeat(2001),
    });
    expect(r.success).toBe(false);
  });
});

describe("agent decision schema", () => {
  const decisionSchema = z.object({
    decision: z.enum(["approved", "rejected"]),
  });

  it("accepts approved and rejected", () => {
    expect(decisionSchema.safeParse({ decision: "approved" }).success).toBe(true);
    expect(decisionSchema.safeParse({ decision: "rejected" }).success).toBe(true);
  });

  it("rejects unknown decisions", () => {
    expect(decisionSchema.safeParse({ decision: "pending" }).success).toBe(false);
    expect(decisionSchema.safeParse({ decision: "" }).success).toBe(false);
    expect(decisionSchema.safeParse({}).success).toBe(false);
  });
});
