-- ==============================================================================
-- ANUBHAV DATABASE SCHEMA
-- "Every expert's experience, saved forever."
--
-- Instructions: Run this script directly in the Supabase SQL Editor.
-- All tables have Row Level Security (RLS) enabled with NO public policies.
-- Server-side access uses the service_role key to bypass RLS securely.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Organizations
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
);

-- 2. Employees
create table if not exists public.employees (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    employee_code text not null,
    password_hash text not null,
    full_name text not null,
    designation text not null default 'Technician',
    department text not null default 'Operations',
    experience_years integer not null default 0,
    phone text default '',
    email text default '',
    joined_on date not null default current_date,
    bio text default '',
    avatar_url text default '',
    created_at timestamptz not null default now(),
    constraint unique_employee_code_per_org unique (org_id, employee_code)
);

-- 3. Machines
create table if not exists public.machines (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    category text not null default 'General',
    description text not null default '',
    image_url text default '',
    specifications text not null default '',
    common_issues text not null default '',
    safety_notes text not null default '',
    updated_at timestamptz not null default now()
);

-- 4. Entries
create table if not exists public.entries (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    employee_id uuid references public.employees(id) on delete set null,
    machine_id uuid references public.machines(id) on delete set null,
    title text not null,
    content_html text not null,
    content_text text not null,
    tags text[] not null default '{}',
    is_safety_critical boolean not null default false,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    rejection_reason text default null,
    author_name_cache text default null, -- preserves author name if employee is removed
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    approved_at timestamptz default null
);

-- 5. Unanswered Questions (logged when Gemini yields "No record found")
create table if not exists public.unanswered_questions (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    question text not null,
    asked_by text not null default 'Anonymous',
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- INDEXES
-- Full text index on entries.content_text and title for fast relevant retrieval
-- ==============================================================================
create index if not exists entries_content_fts_idx on public.entries 
using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')));

create index if not exists entries_org_status_idx on public.entries(org_id, status);
create index if not exists entries_machine_id_idx on public.entries(machine_id);
create index if not exists entries_employee_id_idx on public.entries(employee_id);
create index if not exists employees_org_code_idx on public.employees(org_id, employee_code);
create index if not exists machines_org_idx on public.machines(org_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enabled on all tables with ZERO public access.
-- The anonymous client cannot read or write anything.
-- Only the server (via service_role key) can perform operations.
-- ==============================================================================
alter table public.organizations enable row level security;
alter table public.employees enable row level security;
alter table public.machines enable row level security;
alter table public.entries enable row level security;
alter table public.unanswered_questions enable row level security;

-- Do NOT create any permissive policies for anon or authenticated roles.
-- Service role key bypasses RLS automatically in Supabase Postgres.

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION
-- Bucket: "anubhav-media" (public read for images/avatars)
-- Server-side route uploads files using service_role key.
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('anubhav-media', 'anubhav-media', true)
on conflict (id) do update set public = true;

-- Storage public read policy for anubhav-media bucket
create policy "Public Access to anubhav-media"
on storage.objects for select
using ( bucket_id = 'anubhav-media' );

