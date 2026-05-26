-- Wave 104: Stripe Checkout integration columns on projects.
--
-- We persist just enough to (a) prevent double-charge by detecting an
-- existing session, (b) reconcile the webhook against the project row, and
-- (c) display payment state in the client dashboard.
--
-- `stripe_payment_status` matches Stripe's PaymentIntent.status taxonomy:
--   pending | succeeded | requires_action | canceled | failed
-- We default to NULL — projects without a Stripe session don't surface in
-- the payment UI at all.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stripe_payment_status text;

-- Partial index: most projects never receive a Stripe session, so a partial
-- index on the populated subset is cheaper than a full B-tree.
CREATE INDEX IF NOT EXISTS projects_stripe_session_idx
  ON projects (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

COMMENT ON COLUMN projects.stripe_session_id IS
  'Stripe Checkout Session ID once a session has been opened for the quote.';
COMMENT ON COLUMN projects.stripe_payment_status IS
  'Mirror of Stripe PaymentIntent.status — set by /api/stripe/webhook.';
