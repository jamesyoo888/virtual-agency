-- ─── Creator-tier RLS ───────────────────────────────────────────────────────
-- External creators land in clients with role='client' (the default) but with
-- one or more rows in `models` where owner_id = clients.id. The 4-tier
-- rollout doesn't introduce a new role yet — it leans on owner_id as the
-- creator marker so we can ship a /creator dashboard without touching auth.
--
-- These policies extend visibility so a creator can:
--   * SELECT every model they own (incl. draft / inactive)
--   * SELECT files attached to those models
--   * SELECT projects that target those models (for the inquiry feed)
--   * SELECT raw view rows for their own models (so the creator dashboard can
--     reuse the existing aggregation rather than building a parallel RPC)
--
-- Writes stay restricted: creators do NOT get update/delete on models, files,
-- or projects through these policies — the agency reviews changes through
-- admin tools. When we open self-service later, additive `for update` /
-- `for insert` policies can be layered on without touching reads.

-- ─ models ─
drop policy if exists "owner_select_own_models" on models;
create policy "owner_select_own_models" on models
  for select using (owner_id = auth.uid());

-- ─ model_files ─
drop policy if exists "owner_select_own_model_files" on model_files;
create policy "owner_select_own_model_files" on model_files
  for select using (
    exists (select 1 from models m where m.id = model_id and m.owner_id = auth.uid())
  );

-- ─ projects (read-only inquiry feed) ─
drop policy if exists "owner_select_projects_for_own_models" on projects;
create policy "owner_select_projects_for_own_models" on projects
  for select using (
    exists (select 1 from models m where m.id = projects.model_id and m.owner_id = auth.uid())
  );

-- ─ model_views (analytics) ─
drop policy if exists "owner_select_own_model_views" on model_views;
create policy "owner_select_own_model_views" on model_views
  for select using (
    exists (select 1 from models m where m.id = model_views.model_id and m.owner_id = auth.uid())
  );
