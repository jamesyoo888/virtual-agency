-- Migration 022: project follow-up tracking
--
-- Adds `inquiry_followup_sent_at` to projects so the weekly stale-inquiry cron
-- can guarantee at-most-one nudge per inquiry. Without this column we'd have
-- to widen the cron window to "[7d, 14d)" and still risk double-sending on
-- retries.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS inquiry_followup_sent_at timestamptz;

-- Speeds up the cron's "stale inquiry without follow-up" predicate.
CREATE INDEX IF NOT EXISTS projects_followup_pending_idx
  ON projects (status, created_at)
  WHERE status = 'inquiry' AND inquiry_followup_sent_at IS NULL;
