-- Per-user access control: which companies + which cards a user may view.
create table if not exists public.user_access (
  email         text primary key,
  is_admin      boolean not null default false,
  all_companies boolean not null default false,
  companies     text[]  not null default '{}',
  denied_cards  text[]  not null default '{}',
  updated_at    timestamptz default now()
);
alter table public.user_access enable row level security;

-- SECURITY DEFINER helpers (bypass RLS to avoid recursion in policies).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.user_access
                   where email = lower(auth.jwt() ->> 'email')), false);
$$;

create or replace function public.my_access() returns public.user_access
language sql stable security definer set search_path = public as $$
  select * from public.user_access where email = lower(auth.jwt() ->> 'email') limit 1;
$$;

-- transactions: replace blanket read with permission-based read.
drop policy if exists "auth read tx" on public.transactions;
drop policy if exists "read by access" on public.transactions;
create policy "read by access" on public.transactions for select to authenticated using (
  public.is_admin()
  or exists (
    select 1 from public.my_access() ua
    where (ua.all_companies or transactions.company = any(ua.companies))
      and not (transactions.card = any(ua.denied_cards))
  )
);

-- user_access: users read their own row; admins read/write everything.
drop policy if exists "read own or admin" on public.user_access;
create policy "read own or admin" on public.user_access for select to authenticated using (
  email = lower(auth.jwt() ->> 'email') or public.is_admin()
);
drop policy if exists "admin write" on public.user_access;
create policy "admin write" on public.user_access for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bootstrap the first admin (runs as table owner during migration, bypassing RLS).
insert into public.user_access (email, is_admin, all_companies)
values ('admin@admin.com', true, true)
on conflict (email) do update set is_admin = true, all_companies = true;
