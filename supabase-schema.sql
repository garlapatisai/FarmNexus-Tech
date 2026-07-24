-- Enable pgvector extension for AI RAG vector similarity search
create extension if not exists vector;

-- FarmDirect PRD §9 — apply in Supabase SQL editor; adjust enums/policies as needed.

create type public.user_role as enum ('farmer', 'buyer', 'admin');
create type public.listing_category as enum ('vegetable', 'fruit', 'grain', 'dairy', 'other');
create type public.order_status as enum ('placed', 'accepted', 'rejected', 'dispatched', 'delivered', 'disputed');
create type public.payment_status as enum ('pending', 'paid', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  name text,
  role public.user_role not null,
  location_lat numeric,
  location_lng numeric,
  district text,
  upi_id text,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid (),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  produce_name text not null,
  category public.listing_category not null default 'other',
  price_per_kg numeric not null,
  quantity_kg numeric not null,
  min_order_kg numeric not null default 1,
  photos text[] default '{}',
  available_from date,
  description text,
  is_active boolean not null default true,
  location_lat numeric,
  location_lng numeric,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid (),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  farmer_id uuid not null references public.profiles (id) on delete restrict,
  quantity_kg numeric not null,
  total_amount numeric not null,
  status public.order_status not null default 'placed',
  delivery_address text,
  razorpay_payment_id text,
  payment_status public.payment_status not null default 'pending',
  farmer_rating int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- RAG Knowledge Chunks Table with Vector Embeddings (768 dimensions for Gemini text-embedding-004)
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid (),
  topic text not null,
  title text not null,
  content text not null,
  source text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

-- Vector Similarity Search RPC Function
create or replace function match_knowledge_chunks(
  query_embedding vector(768),
  match_threshold float default 0.15,
  match_count int default 5
)
returns table (
  id uuid,
  topic text,
  title text,
  content text,
  source text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.topic,
    kc.title,
    kc.content,
    kc.source,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Enable Realtime for messages (Dashboard → Database → Replication).
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_chunks enable row level security;

-- Public read policy for RAG knowledge chunks
create policy "Allow public read access to knowledge_chunks"
  on public.knowledge_chunks for select
  using (true);

-- Next: run supabase/policies.sql for RLS, storage bucket, and extra columns.
