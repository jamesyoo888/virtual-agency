-- ─── project_status_history ────────────────────────────────────────────────
-- Append-only audit trail of every status transition on a project. Two
-- consumers today:
--   1) Weekly digest (lib/email/digest) — replaces the brittle "updated in
--      last 7d" heuristic with a real "this project moved on date X" diff.
--   2) Future admin timeline view (operations).
--
-- Why a dedicated table rather than parsing the projects.updated_at trail:
-- updated_at gets bumped by every PATCH (brief edits, invoice changes, etc.),
-- not just status moves. The digest needs to know *what kind* of change a
-- client should care about — status transitions are the signal worth surfacing.
--
-- Writes are explicit (the admin PATCH route inserts a row) rather than
-- trigger-based: keeping the choice in app code makes the audit message
-- (who changed it, why) trivially extensible later.

create table if not exists project_status_history (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references projects(id) on delete cascade,
  from_status  text,                                    -- nullable: first row
  to_status    text not null,
  changed_by   uuid references clients(id) on delete set null,
  changed_at   timestamptz not null default now()
);

create index if not exists project_status_history_project_changed_idx
  on project_status_history (project_id, changed_at desc);

create index if not exists project_status_history_changed_idx
  on project_status_history (changed_at desc);

alter table project_status_history enable row level security;

-- Clients can see their own project's history. Admins see everything. Writes
-- always go through the service role from the admin PATCH route, so we don't
-- need an insert policy.
create policy "client_own_project_status_history" on project_status_history
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_status_history.project_id
        and p.client_id = auth.uid()
    )
  );

create policy "admin_all_project_status_history" on project_status_history
  for all using (is_admin());
