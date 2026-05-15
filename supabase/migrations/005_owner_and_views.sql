-- ─── models.owner_id ─────────────────────────────────────────────────────────
-- Hook for a future marketplace tier: a NULL owner means "owned by the
-- agency itself" (every existing model today). When an external creator
-- joins, their UUID lands here and the 4-tier rollout becomes a one-day
-- job rather than a schema migration on a populated table.

alter table models
  add column if not exists owner_id uuid references clients(id) on delete set null;

create index if not exists models_owner_idx on models(owner_id);

-- ─── model_views ─────────────────────────────────────────────────────────────
-- Server-side page view log for the public model detail page. We do not
-- rely on Vercel Analytics for this because:
--   * we need per-model counts joined with our own tables (catalog sort,
--     creator dashboards later);
--   * dedup happens per visitor cookie, so refresh spam doesn't inflate.
--
-- `viewer_cookie` is a short opaque string (set by the proxy or the page
-- itself); not a Supabase user id. `user_id` is set when the viewer is
-- logged in so we can later compute "clients who viewed X also viewed Y".

create table if not exists model_views (
  id            bigserial primary key,
  model_id      uuid not null references models(id) on delete cascade,
  user_id       uuid references clients(id) on delete set null,
  viewer_cookie text,
  referrer      text,
  created_at    timestamptz not null default now()
);

create index if not exists model_views_model_created_idx
  on model_views(model_id, created_at desc);
create index if not exists model_views_user_created_idx
  on model_views(user_id, created_at desc) where user_id is not null;
create index if not exists model_views_created_idx
  on model_views(created_at desc);

alter table model_views enable row level security;

-- Service role bypasses RLS — that's the only writer (the page handler uses
-- createAdminClient). Admins can read everything for analytics; clients
-- cannot read the log at all (could leak browsing history across users).
create policy "admin_select_model_views" on model_views
  for select using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );
