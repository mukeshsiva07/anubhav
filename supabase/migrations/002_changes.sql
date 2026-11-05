-- ==============================================================================
-- ANUBHAV MIGRATION: 002_changes.sql
-- Run this script in the Supabase SQL Editor.
-- Adds new columns idempotently for Phases 4, 5, and 7.
-- Row Level Security (RLS) remains enabled with no public policies.
-- ==============================================================================

-- 1. Entries additions: thumbnail and attachments
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- 2. Employees additions: senior status and employment status
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS is_senior boolean DEFAULT false;

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 3. Machines additions: status, department, and gallery
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS gallery text[] DEFAULT '{}'::text[];

-- 4. Organizations additions: Industry profile details
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS org_code text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS contact_phone text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS org_email text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS industry_type text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS admin_name text;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS address text;

-- Add unique constraint on org_code if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_code'
    ) THEN
        ALTER TABLE public.organizations ADD CONSTRAINT unique_org_code UNIQUE (org_code);
    END IF;
END $$;
