-- Read-only REST API for external systems: API keys with the same company/card
-- scoping model as user_access. Keys are stored hashed (sha256 hex) — the plaintext
-- key is shown once, at creation time, and never again.
create table if not exists public.api_keys (
  id            bigint generated always as identity primary key,
  name          text not null,
  prefix        text not null,                 -- visible fragment, e.g. "reap_a1b2c3d4"
  key_hash      text not null unique,          -- sha256 hex of the full key
  all_companies boolean not null default false,
  companies     text[]  not null default '{}',
  denied_cards  text[]  not null default '{}',
  active        boolean not null default true,
  expires_at    timestamptz,
  last_used_at  timestamptz,
  created_by    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_api_keys_hash on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

-- Admins list/inspect keys from the dashboard; all writes go through server actions
-- using the service role. No policy for non-admins => no access at all.
drop policy if exists "admin read api keys" on public.api_keys;
create policy "admin read api keys" on public.api_keys for select to authenticated
  using (public.is_admin());
