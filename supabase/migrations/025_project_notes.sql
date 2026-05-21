-- ─── 025_project_notes ─────────────────────────────────────────────────────
-- Internal admin-only notes attached to a project. Used on
-- /admin/projects/[id] to capture quick context that doesn't belong in the
-- client-visible `brief` (e.g., "lead came from a referral, push for
-- exclusive", "pause until budget approved").
--
-- Design notes:
--   - Admin-only RLS. Clients must never see these notes — that's the whole
--     point of having a separate table rather than another column on projects.
--   - `body` is plain text. No rich text, no attachments. The audit-log + admin
--     panel pattern this site already uses keeps things simple.
--   - `author_id` references clients(id) since the admin's identity lives in
--     the same table (role='admin' rows).
--   - We don't enforce an `updated_at` — notes are append-only in practice.
--     If the operator wants to revise context, they add another note.

create table if not exists project_notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  author_id   uuid references clients(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists project_notes_project_created_idx
  on project_notes (project_id, created_at desc);

alter table project_notes enable row level security;

create policy "admin_all_project_notes" on project_notes
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );
