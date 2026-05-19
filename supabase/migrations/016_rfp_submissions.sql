-- ─── rfp_submissions ───────────────────────────────────────────────────────
-- Persists the inputs and top-N recommendation of every authed RFP run.
-- Anonymous visits stay anonymous — no row is written when client_id is null.
-- Why we persist:
--   1) Returning advertisers' history feeds the persona-weighted matcher
--      (lib/matching/persona). The current `projects` signal only fires
--      *after* an inquiry; RFPs that didn't convert leave no trace.
--   2) Admin gets a "RFP funnel" view — what advertisers ask for, vs what
--      they actually inquire about. A leading indicator of demand by tag.
--
-- `inputs` and `recommended` are JSONB so the page's input shape can evolve
-- without a migration. The applicable column comments below name today's
-- structure; consumers should treat unknown keys as opaque.

create table if not exists rfp_submissions (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references clients(id) on delete cascade,
  inputs       jsonb not null,
  -- shape: { campaign?, advertiser?, launch?, durationDays?, channels: text[],
  --          message?, heroCopy?, industries: text[], moods: text[],
  --          targetAge?, budgetBand?, budgetPerDay?: int, needsExclusive?: bool }
  recommended  jsonb not null default '[]',
  -- shape: [{ id: uuid, name, score }] — top 5 from rankModels at write time
  created_at   timestamptz not null default now()
);

create index if not exists rfp_submissions_client_created_idx
  on rfp_submissions (client_id, created_at desc);

alter table rfp_submissions enable row level security;

-- Clients read/write their own submissions; admins see everything.
create policy "client_own_rfp_submissions" on rfp_submissions
  for all using (client_id = auth.uid())
            with check (client_id = auth.uid());

create policy "admin_all_rfp_submissions" on rfp_submissions
  for all using (is_admin());
