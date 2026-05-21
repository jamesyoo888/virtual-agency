import { describe, it, expect } from "vitest";
import { aggregateTopClients } from "@/lib/analytics/top-clients";

describe("aggregateTopClients", () => {
  it("rolls up revenue and delivered count per client_id", () => {
    const out = aggregateTopClients([
      { client_id: "a", invoice_amount: 100, client: { company: "Alpha", email: "a@x" } },
      { client_id: "a", invoice_amount: 50, client: { company: "Alpha", email: "a@x" } },
      { client_id: "b", invoice_amount: 80, client: { company: "Beta", email: "b@x" } },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("a");
    expect(out[0].revenue).toBe(150);
    expect(out[0].delivered).toBe(2);
    expect(out[1].revenue).toBe(80);
  });

  it("sorts by revenue desc, breaking ties on delivered count", () => {
    // Both clients hit ₩100 lifetime, but Beta got there with 2 projects vs
    // Alpha's 1 — the deeper relationship wins the tie.
    const out = aggregateTopClients([
      { client_id: "a", invoice_amount: 100, client: { company: "Alpha" } },
      { client_id: "b", invoice_amount: 50, client: { company: "Beta" } },
      { client_id: "b", invoice_amount: 50, client: { company: "Beta" } },
    ]);
    expect(out[0].id).toBe("b");
    expect(out[1].id).toBe("a");
  });

  it("drops rows without client_id (anonymous projects)", () => {
    const out = aggregateTopClients([
      { client_id: null, invoice_amount: 999, client: null },
      { client_id: "a", invoice_amount: 1, client: { company: "Alpha" } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
  });

  it("falls back to email then '(미상)' when company is blank", () => {
    const out = aggregateTopClients([
      { client_id: "a", invoice_amount: 1, client: { company: "  ", email: "fallback@x.com" } },
      { client_id: "b", invoice_amount: 1, client: { company: null, email: null } },
    ]);
    const a = out.find((c) => c.id === "a");
    const b = out.find((c) => c.id === "b");
    expect(a?.company).toBe("fallback@x.com");
    expect(b?.company).toBe("(미상)");
  });

  it("treats null invoice_amount as zero contribution", () => {
    const out = aggregateTopClients([
      { client_id: "a", invoice_amount: null, client: { company: "Alpha" } },
      { client_id: "a", invoice_amount: 50, client: { company: "Alpha" } },
    ]);
    expect(out[0].revenue).toBe(50);
    expect(out[0].delivered).toBe(2);
  });

  it("respects the limit parameter", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      client_id: `c${i}`,
      invoice_amount: i,
      client: { company: `Client ${i}` },
    }));
    const out = aggregateTopClients(rows, 3);
    expect(out).toHaveLength(3);
    // Highest invoice (c9) ranked first
    expect(out[0].id).toBe("c9");
  });
});
