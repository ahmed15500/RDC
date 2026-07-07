create table if not exists public.financial_projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  status text not null default 'running',
  sector text,
  entity text default 'HU',
  amount_eur numeric(14, 2) default 0,
  project_year integer default 2026,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.financial_projects enable row level security;

create policy if not exists "Authenticated users can view financial projects"
on public.financial_projects
for select
to authenticated
using (true);

create policy if not exists "Authenticated users can insert financial projects"
on public.financial_projects
for insert
to authenticated
with check (auth.uid() = created_by or created_by is null);

create policy if not exists "Authenticated users can update financial projects"
on public.financial_projects
for update
to authenticated
using (true)
with check (true);

create policy if not exists "Authenticated users can delete financial projects"
on public.financial_projects
for delete
to authenticated
using (true);
