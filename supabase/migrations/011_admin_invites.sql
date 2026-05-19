-- ─── admin_invites ──────────────────────────────────────────────────────────
-- One-shot admin promotion tokens. Workflow:
--   1) existing admin POSTs to /api/admin/invites → row created with random token
--   2) admin shares the URL /invite/<token> with the new operator
--   3) recipient logs in (or signs up first), then hits /invite/<token>
--   4) `consume_admin_invite(token)` flips clients.role to 'admin', marks the
--      token used. Idempotent — re-running with the same token by the same
--      user is a no-op.
--
-- Why a table + RPC rather than a magic password column on `clients`:
--   * tokens expire and can be revoked without touching auth.users
--   * the audit trail (who created, who used, when) is visible
--   * the RPC is SECURITY DEFINER so the elevation step doesn't depend on the
--     client's existing role/policies — it works for the brand-new signup.

create table if not exists admin_invites (
  id         uuid primary key default uuid_generate_v4(),
  token      text not null unique,
  created_by uuid references clients(id) on delete set null,
  email_hint text,            -- free-form note (e.g. recipient's email) for the admin's list view
  used_by    uuid references clients(id) on delete set null,
  used_at    timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists admin_invites_unused_idx
  on admin_invites (expires_at) where used_at is null;

alter table admin_invites enable row level security;

-- Admins manage the invite list.
create policy "admin_all_invites" on admin_invites
  for all using (is_admin());

-- The redeem path doesn't read this table directly — it goes through the
-- SECURITY DEFINER RPC below, which bypasses RLS. No public-select policy
-- on purpose: token guessability is the only secret, and exposing the list
-- would let an attacker enumerate live tokens.

-- ── Consume function ──
-- Returns the action taken so the client UI can show a meaningful message.
--   'promoted'      → role flipped from client to admin, token consumed
--   'already_admin' → caller was already admin, token consumed (idempotent)
--   'token_used'    → token had already been consumed by someone else
--   'token_expired' → token past expires_at
--   'invalid_token' → no matching row

create or replace function consume_admin_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv record;
  was_admin boolean;
begin
  if uid is null then
    return 'invalid_token'; -- caller must be authed
  end if;

  select * into inv from admin_invites where token = invite_token;
  if not found then return 'invalid_token'; end if;
  if inv.used_at is not null and inv.used_by <> uid then
    return 'token_used';
  end if;
  if inv.expires_at < now() then return 'token_expired'; end if;

  select (role = 'admin') into was_admin from clients where id = uid;

  update clients set role = 'admin' where id = uid;

  -- Mark consumed (or re-stamp if same user redeems twice — keeps used_at
  -- pointed at the first use, only updates used_by once).
  if inv.used_at is null then
    update admin_invites
      set used_by = uid, used_at = now()
      where id = inv.id;
  end if;

  return case when was_admin then 'already_admin' else 'promoted' end;
end $$;

revoke all on function consume_admin_invite(text) from public;
grant execute on function consume_admin_invite(text) to authenticated;
