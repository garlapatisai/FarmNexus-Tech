-- Run in Supabase SQL Editor AFTER supabase-schema.sql (tables + enums exist).
-- Adds columns, helper, RLS policies, and storage bucket for produce photos.

-- Optional columns (safe re-run)
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists delivery_address text;
alter table public.orders add column if not exists reject_reason text;

-- Admin check (bypasses RLS inside function body when SECURITY DEFINER)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

-- ---------- PROFILES ----------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (
      role = 'farmer'
      and exists (
        select 1 from public.listings l
        where l.farmer_id = profiles.id and l.is_active = true
      )
    )
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ---------- LISTINGS ----------
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings
  for select using (
    is_active = true
    or farmer_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "listings_insert_farmer" on public.listings;
create policy "listings_insert_farmer" on public.listings
  for insert with check (
    farmer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'farmer')
  );

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own" on public.listings
  for update using (farmer_id = auth.uid() or public.is_admin())
  with check (farmer_id = auth.uid() or public.is_admin());

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own" on public.listings
  for delete using (farmer_id = auth.uid() or public.is_admin());

-- ---------- ORDERS ----------
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (
    buyer_id = auth.uid()
    or farmer_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer" on public.orders
  for insert with check (
    buyer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer')
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.farmer_id = farmer_id and l.is_active = true
    )
  );

drop policy if exists "orders_update_parties" on public.orders;
create policy "orders_update_parties" on public.orders
  for update using (
    buyer_id = auth.uid()
    or farmer_id = auth.uid()
    or public.is_admin()
  )
  with check (
    buyer_id = auth.uid()
    or farmer_id = auth.uid()
    or public.is_admin()
  );

-- ---------- MESSAGES ----------
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = messages.order_id
        and (o.buyer_id = auth.uid() or o.farmer_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.farmer_id = auth.uid())
    )
  );

-- ---------- STORAGE: produce-photos ----------
insert into storage.buckets (id, name, public)
values ('produce-photos', 'produce-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "produce_photos_select" on storage.objects;
create policy "produce_photos_select" on storage.objects
  for select using (bucket_id = 'produce-photos');

drop policy if exists "produce_photos_insert" on storage.objects;
create policy "produce_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'produce-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "produce_photos_update" on storage.objects;
create policy "produce_photos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'produce-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "produce_photos_delete" on storage.objects;
create policy "produce_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'produce-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Realtime: Dashboard → Database → publications → enable messages (and optionally orders).
