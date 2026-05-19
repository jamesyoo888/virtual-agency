-- ─── RLS recursion fix ──────────────────────────────────────────────────────
-- 001_init.sql 의 admin policies 가 `exists (select 1 from clients ...)` 패턴.
-- clients 자체의 admin policy 도 같은 EXISTS 를 평가하면서 무한 재귀에 빠짐.
-- 결과: anonymous select 가 "infinite recursion detected in policy for
-- relation clients" 로 실패하고 production 카탈로그가 모두 빈 응답.
--
-- 해결: SECURITY DEFINER 함수 `is_admin()` 로 admin 체크를 우회시키고
-- 모든 admin RLS policy 를 그 함수 호출로 교체. function 이 RLS 우회하므로
-- clients 의 RLS 가 재귀로 진입할 수 없음.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from clients where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ── replace admin policies that referenced the recursive EXISTS pattern ──

drop policy if exists "admin_all_models"            on models;
drop policy if exists "admin_all_model_files"       on model_files;
drop policy if exists "admin_all_age_history"       on model_age_history;
drop policy if exists "admin_read_clients"          on clients;
drop policy if exists "admin_all_products"          on client_products;
drop policy if exists "admin_all_projects"          on projects;
drop policy if exists "admin_all_contracts"         on contracts;
drop policy if exists "admin_all_generation_history" on generation_history;

create policy "admin_all_models" on models
  for all using (is_admin());

create policy "admin_all_model_files" on model_files
  for all using (is_admin());

create policy "admin_all_age_history" on model_age_history
  for all using (is_admin());

create policy "admin_read_clients" on clients
  for select using (is_admin());

create policy "admin_all_products" on client_products
  for all using (is_admin());

create policy "admin_all_projects" on projects
  for all using (is_admin());

create policy "admin_all_contracts" on contracts
  for all using (is_admin());

create policy "admin_all_generation_history" on generation_history
  for all using (is_admin());

-- ── later-migration admin policies on the same pattern ──

drop policy if exists "admin_all_reviews"        on reviews;
create policy "admin_all_reviews" on reviews
  for all using (is_admin());

drop policy if exists "admin_select_model_views" on model_views;
create policy "admin_select_model_views" on model_views
  for select using (is_admin());

drop policy if exists "admin_select_prefs" on client_preferences;
create policy "admin_select_prefs" on client_preferences
  for select using (is_admin());
