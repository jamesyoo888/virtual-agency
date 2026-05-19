-- ─── popularity view ────────────────────────────────────────────────────────
-- Catalog "popular" sort blended follower_count + recent page views. Until
-- now, follower_count alone could mask a model the audience is actively
-- circling but who hasn't accrued IG-style follow counts yet (or vice versa,
-- a model who got popular pre-platform and is now ignored).
--
-- The blend: popularity_score = follower_count + view_count_30d * 10.
-- A view is worth ~10 followers in ranking signal; intentionally biased
-- toward live behavior so cold models don't dominate forever.
--
-- The view is regular (not materialized) so freshness is instant — DB does
-- the group-by on every popular sort. Acceptable while the catalog is sub-
-- 500 models; promote to materialized + pg_cron refresh if it gets hot.

create or replace view models_with_popularity as
select
  m.*,
  coalesce(v.view_count, 0)::bigint as view_count_30d,
  (coalesce(m.follower_count, 0) + coalesce(v.view_count, 0) * 10)::bigint
    as popularity_score
from models m
left join (
  select model_id, count(*)::bigint as view_count
  from model_views
  where created_at >= now() - interval '30 days'
  group by model_id
) v on v.model_id = m.id;

-- Views inherit the RLS of their base tables — `models` already restricts
-- to status=active for anon, and model_views isn't directly selectable
-- (its counts come through this view, aggregated, never row-by-row).
grant select on models_with_popularity to anon, authenticated;
