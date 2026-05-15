-- ─── app_settings ────────────────────────────────────────────────────────────
-- Single-row global app configuration. Right now holds the cost caps so admins
-- can edit them from /admin/usage without redeploying. JSONB keeps the schema
-- forward-compatible for future settings (e.g. per-route caps, model pricing).

create table if not exists app_settings (
  -- BOOLEAN PK with check constraint enforces "exactly one row".
  id          boolean primary key default true check (id),
  caps        jsonb   not null default '{}'::jsonb,
  pricing     jsonb   not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid    references auth.users(id) on delete set null
);

-- Seed the single row so reads never miss.
insert into app_settings (id, caps, pricing)
  values (true, '{}'::jsonb, '{}'::jsonb)
  on conflict (id) do nothing;

alter table app_settings enable row level security;

-- Admins read + write. Service role bypasses RLS regardless.
create policy "admin_all_app_settings" on app_settings
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );
