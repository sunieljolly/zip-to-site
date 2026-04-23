-- Run this in your Supabase SQL editor

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- Sites table
create table if not exists public.sites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  subdomain    text not null unique,
  custom_domain text,
  r2_path      text not null,
  created_at   timestamptz not null default now()
);

-- Row Level Security
alter table public.sites enable row level security;

create policy "Users can view their own sites"
  on public.sites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sites"
  on public.sites for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sites"
  on public.sites for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sites"
  on public.sites for delete
  using (auth.uid() = user_id);

-- Subscriptions table
create table if not exists public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_email   text not null unique,
  plan         text not null default 'free',
  status       text not null default 'active',
  updated_at   timestamptz not null default now()
);

-- Only service role can write subscriptions (set via webhook)
alter table public.subscriptions enable row level security;

create policy "Users can read their own subscription"
  on public.subscriptions for select
  using (auth.email() = user_email);

-- Index for fast subdomain lookups (used by worker KV sync)
create index if not exists sites_subdomain_idx on public.sites (subdomain);
create index if not exists sites_custom_domain_idx on public.sites (custom_domain);
