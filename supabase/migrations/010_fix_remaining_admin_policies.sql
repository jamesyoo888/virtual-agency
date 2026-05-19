-- Final sweep of admin policies that still used the recursive EXISTS pattern.
-- Migration 009 missed `app_settings` (003) and `usage_log` (002) — these were
-- created before the recursion was understood. Same fix: route through
-- is_admin() so RLS evaluation cannot re-enter the clients table.

drop policy if exists "admin_all_app_settings" on app_settings;
create policy "admin_all_app_settings" on app_settings
  for all using (is_admin());

drop policy if exists "admin_all_usage_log" on usage_log;
create policy "admin_all_usage_log" on usage_log
  for all using (is_admin());
