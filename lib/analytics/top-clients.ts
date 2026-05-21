/**
 * Top revenue contributors over a rolling window. Pure aggregation split out
 * from the admin home query so we can unit-test the ranking + tie-break
 * without booting Supabase.
 *
 * Anonymous rows (no client_id) are dropped — they cannot inform outreach.
 */

export interface DeliveredProjectRow {
  client_id: string | null;
  invoice_amount: number | null;
  client?: {
    company?: string | null;
    email?: string | null;
  } | null;
}

export interface TopClientAggregate {
  id: string;
  company: string;
  email: string | null;
  revenue: number;
  delivered: number;
}

export function aggregateTopClients(
  rows: DeliveredProjectRow[],
  limit: number = 5
): TopClientAggregate[] {
  const agg = new Map<string, TopClientAggregate>();
  for (const r of rows) {
    if (!r.client_id) continue;
    const company =
      (r.client?.company ?? "").trim() ||
      r.client?.email ||
      "(미상)";
    const cur =
      agg.get(r.client_id) ??
      ({
        id: r.client_id,
        company,
        email: r.client?.email ?? null,
        revenue: 0,
        delivered: 0,
      } satisfies TopClientAggregate);
    cur.revenue += r.invoice_amount ?? 0;
    cur.delivered += 1;
    agg.set(r.client_id, cur);
  }
  return Array.from(agg.values())
    .sort((a, b) => b.revenue - a.revenue || b.delivered - a.delivered)
    .slice(0, limit);
}
