-- Wave 105: agency-partner auth — hybrid (open signup + admin approval).
--
-- Schema: extend `clients` rather than create a separate `agents` table.
-- Reasons:
--   1) Auth/RLS already keys off clients.id = auth.uid().
--   2) An agent's referrals + projects live in the same Project/Inquiry
--      tables as direct clients; adding a parallel table would force a
--      union in every dashboard query.
--   3) The status machine is small (pending|approved|rejected); easier as
--      a column than as a new entity.
--
-- New columns:
--   role           text DEFAULT 'client'  → 'client' | 'agent' | 'admin'
--   agent_status   text                   → 'pending' | 'approved' | 'rejected'
--   agent_company  text                   → display name for the agency
--   agent_applied_at timestamptz          → signup time, used in admin sort
--
-- Approval flow:
--   - User signs up via /agent/signup → row created with role='agent',
--     agent_status='pending'.
--   - Admin reviews on /admin/agents → updates agent_status to 'approved'
--     or 'rejected'.
--   - Only 'approved' agents see /agent/dashboard's tools (referral link
--     generator, commission tracker, etc.). Pending agents see a polite
--     waiting screen.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client'
    CHECK (role IN ('client', 'agent', 'admin'));

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS agent_status text
    CHECK (agent_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS agent_company text;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS agent_applied_at timestamptz;

-- Partial index: most rows are role='client', so a partial index on agents
-- keeps the admin queue lookup cheap.
CREATE INDEX IF NOT EXISTS clients_agent_pending_idx
  ON clients (agent_applied_at DESC)
  WHERE role = 'agent' AND agent_status = 'pending';

COMMENT ON COLUMN clients.role IS
  'Account role. client = end advertiser; agent = approved agency partner; admin = staff.';
COMMENT ON COLUMN clients.agent_status IS
  'Approval state for role=agent. NULL for non-agent rows.';
COMMENT ON COLUMN clients.agent_company IS
  'Agency display name shown to other operators in /admin/agents and /admin/referrals.';
