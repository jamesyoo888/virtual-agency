-- ─── client_preferences: weekly digest opt-in ──────────────────────────────
-- The digest is opt-in-by-default; clients with the existing row pick up the
-- new column at NULL until they save preferences once, at which point the
-- default flips in via the application-side merge (`DEFAULT_PREFERENCES`).
-- Adding the column with default true keeps the SQL/application contracts
-- aligned for *new* rows.

alter table client_preferences
  add column if not exists email_weekly_digest boolean not null default true;

-- Track when the digest was last sent so we don't double-send when the cron
-- handler runs more than once in a week (cron retries, manual triggers).
alter table client_preferences
  add column if not exists last_digest_sent_at timestamptz;

create index if not exists client_preferences_digest_idx
  on client_preferences (last_digest_sent_at)
  where email_weekly_digest = true;
