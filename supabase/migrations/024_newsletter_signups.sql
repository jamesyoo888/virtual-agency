-- ─── 024_newsletter_signups ────────────────────────────────────────────────
-- Captures email addresses entered into the footer newsletter form. We don't
-- ship the addresses anywhere yet — they sit here until a marketing provider
-- (Resend audiences, Mailerlite, etc.) is wired in. Keeping a local table
-- means we don't lose signups during that interim and can backfill once a
-- provider is chosen.
--
-- Schema notes:
--   - email is the natural key, but we keep a uuid PK so future deletions /
--     unsubscribes won't break references.
--   - `source` records the surface the signup came from (footer, banner,
--     blog) so we can attribute later.
--   - We deliberately do NOT enable RLS for read access — admin code uses
--     the service role. Only INSERT-via-anon is exposed via the API.

create table if not exists newsletter_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  unsubscribed_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index if not exists newsletter_signups_email_lower_idx
  on newsletter_signups (lower(email));

create index if not exists newsletter_signups_created_idx
  on newsletter_signups (created_at desc);

alter table newsletter_signups enable row level security;

-- Admins read everything. Anyone can self-insert via the API (the API uses
-- the service role to bypass RLS, but we still enable RLS so any direct
-- PostgREST exposure stays locked down).
create policy "admin_read_newsletter" on newsletter_signups
  for select using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );
