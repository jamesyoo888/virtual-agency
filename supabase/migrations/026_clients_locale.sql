-- Wave 103: add `clients.locale` so the email dispatcher can pick the
-- Korean (templates.ts) or English (templates-en.ts) template per client.
--
-- Default is 'ko' to preserve existing client behavior. New clients created
-- via /en/* surfaces (Accept-Language → /en redirect, /en/rfp signup) are
-- inserted with locale='en' by the API.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'ko'
    CHECK (locale IN ('ko', 'en'));

COMMENT ON COLUMN clients.locale IS
  'Preferred locale for outbound email + dashboard chrome. ''ko'' or ''en''.';

-- No RLS change needed — locale is read by service-role dispatchers and by
-- the row owner via the existing clients_self_read policy.
