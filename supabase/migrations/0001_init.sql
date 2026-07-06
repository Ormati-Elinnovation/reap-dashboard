-- Reap dashboard schema
create table if not exists public.transactions (
  id            bigint generated always as identity primary key,
  date          date not null,
  month         text not null,
  ts            text,
  tid           text,
  company       text not null,
  card          text not null,
  holder        text not null,
  merchant      text not null,
  cat           text,
  amt           numeric(12,2) not null,
  status        text,
  srv_group     text,
  tech_supplier text,
  tech_group    text
);
create index if not exists idx_tx_company  on public.transactions (company);
create index if not exists idx_tx_month    on public.transactions (month);
create index if not exists idx_tx_card     on public.transactions (card);
create index if not exists idx_tx_merchant on public.transactions (merchant);

create table if not exists public.tech_map (
  merchant text primary key,
  supplier text not null,
  "group"  text not null
);

create table if not exists public.deposits (
  id         bigint generated always as identity primary key,
  company    text not null,
  month      text not null,
  amt        numeric(12,2) not null,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;
alter table public.tech_map     enable row level security;
alter table public.deposits     enable row level security;

drop policy if exists "auth read tx"       on public.transactions;
drop policy if exists "auth read techmap"  on public.tech_map;
drop policy if exists "auth read deposits" on public.deposits;

create policy "auth read tx"       on public.transactions for select to authenticated using (true);
create policy "auth read techmap"  on public.tech_map     for select to authenticated using (true);
create policy "auth read deposits" on public.deposits     for select to authenticated using (true);
