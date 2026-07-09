-- Manual (non-Reap) expenses: same transactions table so they flow everywhere.
alter table public.transactions add column if not exists department text;
alter table public.transactions add column if not exists manual boolean not null default false;
create index if not exists idx_tx_manual on public.transactions (manual);
