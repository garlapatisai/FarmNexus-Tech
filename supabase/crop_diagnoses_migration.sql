-- Run in Supabase SQL Editor to create the crop diagnoses table and setup policies.

-- Create crop diagnoses table
create table if not exists public.crop_diagnoses (
  id uuid primary key default gen_random_uuid (),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  crop_name text not null,
  symptoms text,
  diagnosis text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'healthy')),
  image_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.crop_diagnoses enable row level security;

-- Drop existing policies if any
drop policy if exists "diagnoses_select" on public.crop_diagnoses;
drop policy if exists "diagnoses_insert" on public.crop_diagnoses;
drop policy if exists "diagnoses_delete" on public.crop_diagnoses;

-- Create policies
create policy "diagnoses_select" on public.crop_diagnoses
  for select using (
    farmer_id = auth.uid() 
    or public.is_admin()
  );

create policy "diagnoses_insert" on public.crop_diagnoses
  for insert with check (
    farmer_id = auth.uid()
  );

create policy "diagnoses_delete" on public.crop_diagnoses
  for delete using (
    farmer_id = auth.uid() 
    or public.is_admin()
  );

-- Grant permissions
grant select, insert, update, delete on public.crop_diagnoses to authenticated;
grant select, insert, update, delete on public.crop_diagnoses to anon;
grant select, insert, update, delete on public.crop_diagnoses to service_role;
