-- ─── reviews ─────────────────────────────────────────────────────────────────
-- Per-project review of a model. Workflow:
--   pending  → admin moderation
--   approved → public on the model detail page + JSON-LD aggregateRating
--   rejected → kept for the audit trail, hidden from public
--
-- One review per (project_id, client_id) pair — a single project can only
-- produce one review. The model_id is denormalized to make the public-facing
-- "reviews for this model" query a single index hit.

create table if not exists reviews (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  model_id    uuid not null references models(id)   on delete cascade,
  client_id   uuid not null references clients(id)  on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  -- Admin moderation trail.
  reviewed_by uuid references clients(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, client_id)
);

create index if not exists reviews_model_status_idx
  on reviews (model_id, status);
create index if not exists reviews_status_created_idx
  on reviews (status, created_at desc);

-- Auto-update updated_at on row change (reuses the project pattern).
create or replace function reviews_set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_reviews_updated_at on reviews;
create trigger trg_reviews_updated_at
  before update on reviews
  for each row execute function reviews_set_updated_at();

alter table reviews enable row level security;

-- Clients: read their own reviews regardless of status.
create policy "client_select_own_reviews" on reviews
  for select using (client_id = auth.uid());

-- Public: read approved reviews. The model detail page renders these.
create policy "public_select_approved_reviews" on reviews
  for select using (status = 'approved');

-- Clients: insert a review for their own delivered project. We deliberately
-- do not check `projects.status` here — that lives in the application layer
-- so the policy stays simple and the audit trail captures every attempt.
create policy "client_insert_own_review" on reviews
  for insert with check (client_id = auth.uid());

-- Clients: edit their own pending review (no edits after moderation).
create policy "client_update_pending_review" on reviews
  for update using (client_id = auth.uid() and status = 'pending')
              with check (client_id = auth.uid() and status = 'pending');

-- Admins: full access (approve / reject / hard-delete).
create policy "admin_all_reviews" on reviews
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );
