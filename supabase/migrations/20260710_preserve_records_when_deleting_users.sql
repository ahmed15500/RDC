-- Preserve operational records when an authentication user is deleted.
-- The user's profile will still be removed through the existing ON DELETE CASCADE,
-- but submitted activities and financial records will remain for reporting/audit purposes.

alter table if exists public.activities
  add column if not exists submitted_by_email text;

alter table if exists public.activities
  alter column submitted_by drop not null;

alter table if exists public.activities
  drop constraint if exists activities_submitted_by_fkey;

alter table if exists public.activities
  add constraint activities_submitted_by_fkey
  foreign key (submitted_by)
  references auth.users(id)
  on delete set null;

alter table if exists public.financial_projects
  add column if not exists created_by_email text;

alter table if exists public.financial_projects
  drop constraint if exists financial_projects_created_by_fkey;

alter table if exists public.financial_projects
  add constraint financial_projects_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;
