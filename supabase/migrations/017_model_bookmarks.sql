-- ─── model_bookmarks ───────────────────────────────────────────────────────
-- Per-client model favorites. Lightweight: just (client_id, model_id, when).
-- Why a dedicated table rather than tagging on `clients` JSONB:
--   * indexable by (client_id, created_at) for the bookmarks list page
--   * cascade-on-delete cleans up when either side is removed
--   * RLS is straightforward — owner reads/writes their own row.
--
-- The unique constraint is on (client_id, model_id) so a re-bookmark of the
-- same model is a no-op rather than a duplicate row (the API surfaces 23505
-- as a 409, which the client handles as "already bookmarked").

create table if not exists model_bookmarks (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  model_id    uuid not null references models(id)  on delete cascade,
  created_at  timestamptz not null default now(),
  unique (client_id, model_id)
);

create index if not exists model_bookmarks_client_created_idx
  on model_bookmarks (client_id, created_at desc);

create index if not exists model_bookmarks_model_idx
  on model_bookmarks (model_id);

alter table model_bookmarks enable row level security;

create policy "client_own_model_bookmarks" on model_bookmarks
  for all using (client_id = auth.uid())
            with check (client_id = auth.uid());

create policy "admin_all_model_bookmarks" on model_bookmarks
  for all using (is_admin());
