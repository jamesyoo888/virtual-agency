-- ─── co_viewed_models ────────────────────────────────────────────────────────
-- "Clients who viewed X also viewed Y" — collaborative filtering on the
-- model_views log. We collapse (user_id ∪ viewer_cookie) into a single
-- viewer identity so anonymous browsers don't get dropped just because
-- they never logged in. Anonymous cookies are noisier than user_ids but
-- still produce useful overlaps once the catalog has trickled a few hundred
-- views.
--
-- Returns at most `max_results` (default 6) sibling models, ranked by the
-- raw count of shared viewers. Tag-based similarity remains the cold-start
-- fallback inside the page handler.

create or replace function get_co_viewed_models(
  target_model_id uuid,
  max_results integer default 6
) returns table(model_id uuid, co_view_count bigint)
language sql security definer as $$
  with viewers as (
    select distinct coalesce(user_id::text, viewer_cookie) as v
    from model_views
    where model_id = target_model_id
      and created_at >= now() - interval '90 days'
      and coalesce(user_id::text, viewer_cookie) is not null
  )
  select
    v2.model_id,
    count(*)::bigint as co_view_count
  from model_views v2
  where coalesce(v2.user_id::text, v2.viewer_cookie) in (select v from viewers)
    and v2.model_id <> target_model_id
    and v2.created_at >= now() - interval '90 days'
  group by v2.model_id
  order by co_view_count desc
  limit max_results;
$$;

-- Anonymous catalog users see "people also viewed" sections, so expose to
-- the anon role. The function aggregates counts only — no raw cookies or
-- user_ids escape — so this doesn't compromise the model_views RLS.
grant execute on function get_co_viewed_models(uuid, integer) to anon, authenticated;
