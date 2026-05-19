-- ─── creator_applications ──────────────────────────────────────────────────
-- External creator onboarding queue. Anyone authed can submit an application
-- describing the work they'd bring to the agency; admins review and approve
-- (or reject) from /admin/creators. On approval the admin associates one or
-- more existing models with this client via models.owner_id — at that point
-- the /creator dashboard lights up for them (migration 013 RLS).
--
-- Why a dedicated table rather than just flipping clients.role:
--   * the queue itself is the operational artifact — admins need to triage
--   * we capture portfolio / contact metadata the clients row doesn't carry
--   * approval is reversible without losing the application record.

create table if not exists creator_applications (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references clients(id) on delete cascade,
  display_name    text not null,
  bio             text,
  portfolio_url   text,
  instagram_handle text,
  notes           text,                       -- free-form pitch
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by     uuid references clients(id) on delete set null,
  reviewed_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (client_id)
);

create index if not exists creator_applications_status_created_idx
  on creator_applications (status, created_at desc);

create or replace function creator_applications_set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_creator_applications_updated_at on creator_applications;
create trigger trg_creator_applications_updated_at
  before update on creator_applications
  for each row execute function creator_applications_set_updated_at();

alter table creator_applications enable row level security;

create policy "client_own_creator_application" on creator_applications
  for all using (client_id = auth.uid())
            with check (client_id = auth.uid());

create policy "admin_all_creator_applications" on creator_applications
  for all using (is_admin());
