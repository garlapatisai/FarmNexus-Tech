-- Run in Supabase SQL Editor to create the crop loss reports table and setup policies.

-- Create crop loss reports table
create table if not exists public.crop_loss_reports (
  id uuid primary key default gen_random_uuid (),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  crop_name text not null,
  cause_type text not null check (cause_type in ('flood', 'drought', 'hail', 'pest', 'disease', 'other')),
  crop_age_weeks integer,
  affected_area_acres numeric,
  description text,
  assessment_summary text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'catastrophic')),
  estimated_loss_percent integer check (estimated_loss_percent >= 0 and estimated_loss_percent <= 100),
  remedies text,
  insurance_eligibility text,
  image_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.crop_loss_reports enable row level security;

-- Drop existing policies if any
drop policy if exists "loss_reports_select" on public.crop_loss_reports;
drop policy if exists "loss_reports_insert" on public.crop_loss_reports;
drop policy if exists "loss_reports_delete" on public.crop_loss_reports;

-- Create policies
create policy "loss_reports_select" on public.crop_loss_reports
  for select using (
    farmer_id = auth.uid() 
    or public.is_admin()
  );

create policy "loss_reports_insert" on public.crop_loss_reports
  for insert with check (
    farmer_id = auth.uid()
  );

create policy "loss_reports_delete" on public.crop_loss_reports
  for delete using (
    farmer_id = auth.uid() 
    or public.is_admin()
  );

-- Grant permissions
grant select, insert, update, delete on public.crop_loss_reports to authenticated;
grant select, insert, update, delete on public.crop_loss_reports to anon;
grant select, insert, update, delete on public.crop_loss_reports to service_role;
