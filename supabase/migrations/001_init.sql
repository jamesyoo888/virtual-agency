-- Virtual Agency Platform — Initial Schema
-- Run in Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- ─── MODELS ───────────────────────────────────────────────────────────────────
create table if not exists models (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  slug                  text unique not null,
  debut_date            date,
  bio                   text,
  personality           text,
  industry_tags         text[] default '{}',
  genre_tags            text[] default '{}',
  mood_tags             text[] default '{}',
  instagram_handle      text,
  follower_count        integer not null default 0,
  base_price            integer,          -- KRW per day
  exclusive_price       integer,
  is_exclusive_available boolean not null default true,
  concept_image         text,             -- Supabase Storage public URL
  status                text not null default 'draft'
                          check (status in ('draft', 'active', 'inactive')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists model_files (
  id         uuid primary key default uuid_generate_v4(),
  model_id   uuid not null references models(id) on delete cascade,
  file_type  text not null check (file_type in ('concept','reference','generated','3d_mesh','texture','portfolio')),
  url        text not null,
  version    integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists model_age_history (
  id                  uuid primary key default uuid_generate_v4(),
  model_id            uuid not null references models(id) on delete cascade,
  age_value           integer not null,
  visual_description  text,
  thumbnail_url       text,
  recorded_at         timestamptz not null default now()
);

-- ─── CLIENTS ──────────────────────────────────────────────────────────────────
create table if not exists clients (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'client' check (role in ('admin', 'client')),
  company    text,
  name       text,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists client_products (
  id             uuid primary key default uuid_generate_v4(),
  client_id      uuid not null references clients(id) on delete cascade,
  name           text not null,
  description    text,
  dimensions_mm  jsonb,                    -- {w, h, d}
  weight_g       integer,
  material       text,
  surface_type   text check (surface_type in ('matte','semi-gloss','glossy')),
  image_urls     text[] default '{}',
  file_3d_url    text,
  is_3d_ready    boolean not null default false,
  test_mode      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
create table if not exists projects (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references clients(id) on delete cascade,
  model_id         uuid references models(id),
  product_id       uuid references client_products(id),
  title            text not null,
  brief            text,
  reference_images text[] default '{}',
  status           text not null default 'inquiry'
                     check (status in ('inquiry','brief_received','in_progress','review','delivered')),
  invoice_amount   integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── CONTRACTS ────────────────────────────────────────────────────────────────
create table if not exists contracts (
  id                    uuid primary key default uuid_generate_v4(),
  client_id             uuid not null references clients(id) on delete cascade,
  model_id              uuid not null references models(id),
  tier                  text not null check (tier in ('non-exclusive','category','full')),
  category_restriction  text,
  start_date            date not null,
  end_date              date not null,
  price                 integer not null,
  status                text not null default 'active' check (status in ('active','expired','terminated')),
  created_at            timestamptz not null default now()
);

-- ─── GENERATION HISTORY ───────────────────────────────────────────────────────
create table if not exists generation_history (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid references projects(id) on delete set null,
  model_id          uuid not null references models(id),
  type              text not null check (type in ('image','video')),
  prompt            text,
  parameters        jsonb default '{}',
  result_urls       text[] default '{}',
  consistency_score numeric(4,2),
  created_at        timestamptz not null default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists models_status_idx on models(status);
create index if not exists models_industry_idx on models using gin(industry_tags);
create index if not exists projects_client_idx on projects(client_id);
create index if not exists projects_status_idx on projects(status);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger models_updated_at
  before update on models
  for each row execute function update_updated_at();

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- ─── AUTO-CREATE CLIENT ROW ON SIGNUP ─────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.clients (id, role, email)
  values (new.id, 'client', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── RLS POLICIES ─────────────────────────────────────────────────────────────
alter table models            enable row level security;
alter table model_files       enable row level security;
alter table model_age_history enable row level security;
alter table clients           enable row level security;
alter table client_products   enable row level security;
alter table projects          enable row level security;
alter table contracts         enable row level security;
alter table generation_history enable row level security;

-- Public: anyone can read active models (showcase)
create policy "public_read_active_models" on models
  for select using (status = 'active');

-- Admin: full access to models
create policy "admin_all_models" on models
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Admin: full access to model_files
create policy "admin_all_model_files" on model_files
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Public: anyone can read model_files of active models
create policy "public_read_model_files" on model_files
  for select using (
    exists (select 1 from models where id = model_id and status = 'active')
  );

-- Admin: full access to model_age_history
create policy "admin_all_age_history" on model_age_history
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Clients: read own row
create policy "client_read_own" on clients
  for select using (id = auth.uid());

-- Clients: update own row
create policy "client_update_own" on clients
  for update using (id = auth.uid());

-- Admin: read all clients
create policy "admin_read_clients" on clients
  for select using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Client products
create policy "client_own_products" on client_products
  for all using (client_id = auth.uid());

create policy "admin_all_products" on client_products
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Projects
create policy "client_own_projects" on projects
  for all using (client_id = auth.uid());

create policy "admin_all_projects" on projects
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Contracts
create policy "client_read_own_contracts" on contracts
  for select using (client_id = auth.uid());

create policy "admin_all_contracts" on contracts
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

-- Generation history
create policy "admin_all_generation_history" on generation_history
  for all using (
    exists (select 1 from clients where id = auth.uid() and role = 'admin')
  );

create policy "client_read_own_generation" on generation_history
  for select using (
    project_id in (select id from projects where client_id = auth.uid())
  );

-- ─── SEED: Promote first admin (run manually after first signup) ───────────────
-- UPDATE clients SET role = 'admin' WHERE id = '<your-auth-user-uuid>';
