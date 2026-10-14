-- Legua Wings: esquema compatible con el panel web y roles de personal.
-- Ejecutar en Supabase SQL Editor (Database). Es idempotente para poder aplicar mejoras.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null check (char_length(customer_name) between 1 and 70),
  customer_phone text,
  order_type text not null check (order_type in ('Delivery','Recojo en local')),
  delivery_address text,
  notes text,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0 and discount <= subtotal),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'received' check (status in ('received','accepted','preparing','ready','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create or replace function public.touch_order_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_order_updated_at();

-- Roles are assigned only by the project owner using SQL Editor/Admin tools.
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;
grant select on public.staff_roles to authenticated;

drop policy if exists "staff can read own role" on public.staff_roles;
create policy "staff can read own role"
on public.staff_roles
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.has_staff_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;
revoke all on function public.has_staff_role(text) from public;
grant execute on function public.has_staff_role(text) to authenticated;

alter table public.orders enable row level security;

-- Remove legacy policies and recreate restricted policies.
drop policy if exists "public can submit orders" on public.orders;
drop policy if exists "staff can read orders" on public.orders;
drop policy if exists "staff can update orders" on public.orders;
drop policy if exists "admin and kitchen can read orders" on public.orders;
drop policy if exists "admin and kitchen can update orders" on public.orders;
drop policy if exists "admin can read all orders" on public.orders;
drop policy if exists "kitchen can read active orders" on public.orders;
drop policy if exists "admin can update order status" on public.orders;
drop policy if exists "kitchen can update active order status" on public.orders;

create policy "public can submit orders"
on public.orders
for insert
to anon, authenticated
with check (
  status = 'received'
  and subtotal >= 0
  and discount >= 0
  and discount <= subtotal
  and total = subtotal - discount
  and char_length(customer_name) between 1 and 70
  and order_type in ('Delivery','Recojo en local')
  and (order_type <> 'Delivery' or coalesce(char_length(delivery_address),0) > 0)
  and jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) > 0
);

create policy "admin can read all orders"
on public.orders
for select
to authenticated
using ((select public.has_staff_role('admin')));

create policy "kitchen can read active orders"
on public.orders
for select
to authenticated
using (
  (select public.has_staff_role('kitchen'))
  and status not in ('delivered','cancelled')
);

create policy "admin can update order status"
on public.orders
for update
to authenticated
using ((select public.has_staff_role('admin')))
with check ((select public.has_staff_role('admin')));

create policy "kitchen can update active order status"
on public.orders
for update
to authenticated
using (
  (select public.has_staff_role('kitchen'))
  and status not in ('delivered','cancelled')
)
with check (
  (select public.has_staff_role('kitchen'))
  and status not in ('delivered','cancelled')
);

-- Only fields needed by the frontend are granted. Updates are limited to status.
grant usage on schema public to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select on public.orders to authenticated;
revoke update on public.orders from authenticated;
grant update(status) on public.orders to authenticated;

-- Enable realtime for the shared kitchen/admin panel.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;
