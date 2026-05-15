-- ─── usage_log ────────────────────────────────────────────────────────────────
-- Per-call usage record for paid generation routes (image / video / lipsync / meshy).
-- Powers the cost cap (lib/cost/cap.ts) and the /admin/usage dashboard.

create table if not exists usage_log (
  id          uuid        primary key default gen_random_uuid(),
  route       text        not null,
  model       text        not null,
  cost_usd    numeric(10, 4) not null default 0,
  user_id     uuid        references auth.users(id) on delete set null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Cap queries are time-windowed sums, so index by created_at desc.
create index if not exists idx_usage_log_created_at
  on usage_log (created_at desc);

-- Optional: per-user breakdown later
create index if not exists idx_usage_log_user_id
  on usage_log (user_id);

-- RLS — admin-only read/write, service role bypasses RLS regardless.
alter table usage_log enable row level security;

create policy "admin_all_usage_log" on usage_log
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );
