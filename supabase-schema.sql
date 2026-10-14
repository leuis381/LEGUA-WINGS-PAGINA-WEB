-- Legua Wings: ejecutar en Supabase SQL Editor.
-- Luego crea usuarios staff en Authentication > Users (correo/contraseña) para administrador y cocina.
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
  discount numeric(10,2) not null default 0 check (discount >= 0),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'received' check (status in ('received','accepted','preparing','ready','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create or replace function public.touch_order_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_order_updated_at();
alter table public.orders enable row level security;
-- Public clients may only create orders. No anonymous reading/updating/deleting.
drop policy if exists "public can submit orders" on public.orders;
create policy "public can submit orders" on public.orders for insert to anon, authenticated with check (
  status = 'received' and subtotal >= 0 and discount >= 0 and total >= 0
  and char_length(customer_name) between 1 and 70
  and (order_type <> 'Delivery' or coalesce(char_length(delivery_address),0) > 0)
);
-- Only signed-in staff can read and manage orders. Staff accounts must be created by the owner.
drop policy if exists "staff can read orders" on public.orders;
create policy "staff can read orders" on public.orders for select to authenticated using (auth.uid() is not null);
drop policy if exists "staff can update orders" on public.orders;
create policy "staff can update orders" on public.orders for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
-- Do not permit deleting orders from the dashboard; retain audit history.
grant usage on schema public to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
-- Enable realtime for kitchen/admin dashboards (safe to run if already added).
do $$ begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; when undefined_object then null; end $$;
