-- ─── client_preferences ─────────────────────────────────────────────────────
-- Per-client notification toggles. Splits the "do we email this person"
-- question off the `clients` table so future preferences (digest cadence,
-- locale, push opt-in) don't keep widening the core row.
--
-- Defaults are opt-in across the board — most clients want the receipts
-- and status pings. Folding to opt-out would mean a one-line update; the
-- application-side helper `canEmailClient` reads `coalesce(col, true)` so
-- a missing row behaves identically to all-defaults.

create table if not exists client_preferences (
  client_id                 uuid primary key references clients(id) on delete cascade,
  email_inquiry_receipt     boolean not null default true,
  email_status_changes      boolean not null default true,
  email_quote_ready         boolean not null default true,
  toast_status_changes      boolean not null default true,
  updated_at                timestamptz not null default now()
);

create or replace function client_preferences_set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_client_preferences_updated_at on client_preferences;
create trigger trg_client_preferences_updated_at
  before update on client_preferences
  for each row execute function client_preferences_set_updated_at();

alter table client_preferences enable row level security;

-- Clients read/write only their own preferences.
create policy "client_select_own_prefs" on client_preferences
  for select using (client_id = auth.uid());

create policy "client_upsert_own_prefs" on client_preferences
  for insert with check (client_id = auth.uid());

create policy "client_update_own_prefs" on client_preferences
  for update using (client_id = auth.uid())
              with check (client_id = auth.uid());

-- Admins can read for support purposes (never write — clients own this).
-- Uses is_admin() (migration 009) so we don't reintroduce the recursive
-- EXISTS pattern that broke production.
create policy "admin_select_prefs" on client_preferences
  for select using (is_admin());
