-- ─── projects: attribution columns ─────────────────────────────────────────
-- Marketing attribution for inquiries. Captured at the moment an inquiry is
-- submitted; never updated afterward (the "source" of an inquiry is whatever
-- ad/post brought them in, not where they later returned from).
--
-- Why columns on `projects` rather than a separate `inquiry_attribution`
-- table:
--   * 1:1 with the project — no second roundtrip in the admin list view
--   * no orphan rows if a project is deleted
--   * existing RLS already covers it (admin sees all, client sees own).
--
-- All four fields are nullable. A visitor that lands directly with no
-- params and no referrer leaves them empty — that's fine, "direct" is a
-- valid source.

alter table projects
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists referrer     text;

-- Index supports "show me last 30d projects grouped by utm_source" — the
-- admin funnel widget's primary lookup.
create index if not exists projects_utm_source_created_idx
  on projects (utm_source, created_at desc)
  where utm_source is not null;
