-- ─── experiment_events ─────────────────────────────────────────────────────
-- Lightweight A/B funnel tracking. Two kinds of rows:
--   'impression' — visitor with bucket X loaded the experiment surface
--                  (e.g. catalog hero). One row per (key, viewer_cookie).
--   'conversion' — same visitor performed the desired action
--                  (e.g. submitted an inquiry).
--
-- Why one table with a `kind` column instead of two: aggregation queries are
-- almost always "impressions/conversions per variant per day" — keeping both
-- in one table lets the admin dashboard do a single roundtrip with GROUP BY.
--
-- UNIQUE per (key, viewer_cookie, kind) is intentional: a refresh storm or
-- repeat inquiry from the same visitor must not inflate counts. We surface
-- the unique violation as `23505` and swallow it in the writer.

create table if not exists experiment_events (
  id           uuid primary key default uuid_generate_v4(),
  key          text not null,
  variant      text not null,
  kind         text not null check (kind in ('impression', 'conversion')),
  viewer_cookie text not null,
  user_id      uuid references clients(id) on delete set null,
  surface      text,                  -- e.g. 'catalog_hero', 'model_detail' — optional context
  created_at   timestamptz not null default now()
);

create unique index if not exists experiment_events_unique
  on experiment_events (key, viewer_cookie, kind);

create index if not exists experiment_events_lookup
  on experiment_events (key, kind, created_at desc);

alter table experiment_events enable row level security;

-- Admins read aggregates. Writes go through the service role from the server
-- so no insert policy is needed.
create policy "admin_all_experiment_events" on experiment_events
  for all using (is_admin());
