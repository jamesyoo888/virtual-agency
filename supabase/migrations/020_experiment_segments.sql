-- ─── experiment_events: device + visitor_type ─────────────────────────────
-- Adds two segmentation dimensions to the A/B funnel so the admin can ask
-- "does the hero CTA win on mobile but lose on desktop?" or
-- "is the lift on new visitors or returning?".
--
-- Why we capture the dimensions at write time rather than computing them at
-- query time:
--   * device: requires the user-agent header — only available at request
--     handling. Recomputing later means losing the signal entirely.
--   * visitor_type: derived from the viewer cookie's embedded creation
--     timestamp (lib/experiments-track parses it). Computing at query time
--     would need a separate "first seen" table.
--
-- Existing rows get 'unknown' so historical aggregates stay valid.

alter table experiment_events
  add column if not exists device       text default 'unknown',
  add column if not exists visitor_type text default 'unknown';

-- Index supports the segmented dashboard query
-- (group by key, variant, kind, device | visitor_type).
create index if not exists experiment_events_segments_idx
  on experiment_events (key, kind, device, visitor_type);
