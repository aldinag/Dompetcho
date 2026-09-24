-- Dompetcho MVP1 schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query) after
-- enabling the Google auth provider (see README "Supabase setup").

-- === Tables ==================================================================

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  google_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  icon text not null,
  is_default boolean not null default false
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  note text,
  date timestamptz not null,
  source text not null check (source in ('manual', 'receipt_ocr')),
  type text not null default 'expense' check (type in ('income', 'expense')),
  created_at timestamptz not null default now()
);

-- Safe to re-run against a database that already had `expenses` without `type`.
alter table public.expenses add column if not exists type text not null default 'expense';
alter table public.expenses drop constraint if exists expenses_type_check;
alter table public.expenses add constraint expenses_type_check check (type in ('income', 'expense'));

create table if not exists public.receipt_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  expense_id uuid references public.expenses (id) on delete set null,
  raw_ocr_text text,
  image_uri text,
  bank_detected text not null check (bank_detected in ('mandiri', 'unrecognized')),
  parsed_amount numeric(14, 2),
  parsed_date timestamptz,
  parsed_recipient text,
  parsed_reference_no text,
  status text not null default 'pending_review' check (status in ('pending_review', 'confirmed', 'discarded')),
  created_at timestamptz not null default now()
);

-- Safe to re-run: converts older `date` (calendar day) columns to timestamptz once. Existing
-- rows become midnight WIB on their day, so they keep the same local date in Indonesia.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'expenses' and column_name = 'date') = 'date' then
    alter table public.expenses
      alter column date type timestamptz using (date::timestamp at time zone 'Asia/Jakarta');
  end if;
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'receipt_scans' and column_name = 'parsed_date') = 'date' then
    alter table public.receipt_scans
      alter column parsed_date type timestamptz using (parsed_date::timestamp at time zone 'Asia/Jakarta');
  end if;
end $$;

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);
create index if not exists receipt_scans_user_status_idx on public.receipt_scans (user_id, status);

-- === Auto-provision a user + their default categories on first Google sign-in ===

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, google_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.raw_user_meta_data ->> 'sub'
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, icon, is_default)
  values
    (new.id, 'Food', '🍜', true),
    (new.id, 'Transport', '🚗', true),
    (new.id, 'Shopping', '🛍️', true),
    (new.id, 'Bills', '🧾', true),
    (new.id, 'Entertainment', '🎬', true),
    (new.id, 'Health', '💊', true),
    (new.id, 'Transfer', '💸', true),
    (new.id, 'Other', '📦', true)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- === Row Level Security ======================================================

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.receipt_scans enable row level security;

-- Postgres has no `create policy if not exists`, so each is dropped first — safe to re-run.
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile" on public.users
  for select using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile" on public.users
  for update using (id = auth.uid());

drop policy if exists "Users can view their own categories" on public.categories;
create policy "Users can view their own categories" on public.categories
  for select using (user_id = auth.uid());

drop policy if exists "Users can manage their own categories" on public.categories;
create policy "Users can manage their own categories" on public.categories
  for insert with check (user_id = auth.uid());

drop policy if exists "Users can update their own categories" on public.categories;
create policy "Users can update their own categories" on public.categories
  for update using (user_id = auth.uid());

drop policy if exists "Users can delete their own categories" on public.categories;
create policy "Users can delete their own categories" on public.categories
  for delete using (user_id = auth.uid());

drop policy if exists "Users can view their own expenses" on public.expenses;
create policy "Users can view their own expenses" on public.expenses
  for select using (user_id = auth.uid());

drop policy if exists "Users can insert their own expenses" on public.expenses;
create policy "Users can insert their own expenses" on public.expenses
  for insert with check (user_id = auth.uid());

drop policy if exists "Users can update their own expenses" on public.expenses;
create policy "Users can update their own expenses" on public.expenses
  for update using (user_id = auth.uid());

drop policy if exists "Users can delete their own expenses" on public.expenses;
create policy "Users can delete their own expenses" on public.expenses
  for delete using (user_id = auth.uid());

drop policy if exists "Users can view their own receipt scans" on public.receipt_scans;
create policy "Users can view their own receipt scans" on public.receipt_scans
  for select using (user_id = auth.uid());

drop policy if exists "Users can insert their own receipt scans" on public.receipt_scans;
create policy "Users can insert their own receipt scans" on public.receipt_scans
  for insert with check (user_id = auth.uid());

drop policy if exists "Users can update their own receipt scans" on public.receipt_scans;
create policy "Users can update their own receipt scans" on public.receipt_scans
  for update using (user_id = auth.uid());

drop policy if exists "Users can delete their own receipt scans" on public.receipt_scans;
create policy "Users can delete their own receipt scans" on public.receipt_scans
  for delete using (user_id = auth.uid());
