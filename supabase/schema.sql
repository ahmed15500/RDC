create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  activity_name text not null,
  activity_type text not null,
  village text not null,
  date_period text,
  responsible_person text,
  partner text,
  target_group text,
  objective text,
  description text,
  direct_beneficiaries numeric default 0,
  indirect_beneficiaries numeric default 0,
  households numeric default 0,
  women numeric default 0,
  women_trained numeric default 0,
  youth numeric default 0,
  children_students numeric default 0,
  farmers numeric default 0,
  schools numeric default 0,
  teachers numeric default 0,
  volunteers numeric default 0,
  community_events numeric default 0,
  trainings numeric default 0,
  health_cases numeric default 0,
  waste_collected_kg numeric default 0,
  waste_recycled_kg numeric default 0,
  waste_composted_kg numeric default 0,
  trees_planted numeric default 0,
  income_generated numeric default 0,
  jobs_created numeric default 0,
  products_sold numeric default 0,
  ecology_impact text,
  society_impact text,
  culture_impact text,
  economy_impact text,
  sdgs jsonb default '[]'::jsonb,
  key_outcome text,
  challenge text,
  success_story text,
  evidence_link text,
  future_opportunity text,
  data_confirmed text default 'Needs review',
  data_source text,
  approval_status text default 'pending',
  admin_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  department text,
  role text not null default 'viewer' check (role in ('admin', 'stakeholder', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists role text default 'viewer';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles
set role = 'viewer'
where role is null;

alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
    and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_role_check check (role in ('admin', 'stakeholder', 'viewer'));
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, department, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'department', ''),
    case
      when lower(new.email) = 'ahmed.bahrawy@hu.edu.eg' then 'admin'
      else 'viewer'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(nullif(excluded.name, ''), profiles.name),
    department = coalesce(nullif(excluded.department, ''), profiles.department),
    role = case
      when lower(excluded.email) = 'ahmed.bahrawy@hu.edu.eg' then 'admin'
      else profiles.role
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, name, department, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'name', ''),
  coalesce(raw_user_meta_data ->> 'department', ''),
  case
    when lower(email) = 'ahmed.bahrawy@hu.edu.eg' then 'admin'
    else 'viewer'
  end
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  name = coalesce(nullif(excluded.name, ''), profiles.name),
  department = coalesce(nullif(excluded.department, ''), profiles.department),
  role = case
    when lower(excluded.email) = 'ahmed.bahrawy@hu.edu.eg' then 'admin'
    else profiles.role
  end,
  updated_at = now();

alter table public.profiles enable row level security;
alter table public.activities enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Ahmed admin can read all profiles" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can update own basic profile" on public.profiles;
drop policy if exists "Ahmed admin can update profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Ahmed admin can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg');

create policy "Users can create own profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and (
      role = 'viewer'
      or (role = 'admin' and lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg')
    )
  );

create policy "Users can update own basic profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      role = 'viewer'
      or (role = 'admin' and lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg')
    )
  );

create policy "Ahmed admin can update profiles"
  on public.profiles
  for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg')
  with check (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg');

drop policy if exists "Authenticated users can submit activities" on public.activities;
drop policy if exists "Users can read their own activities" on public.activities;
drop policy if exists "Authenticated users can read approved activities" on public.activities;
drop policy if exists "Ahmed admin can read all activities" on public.activities;
drop policy if exists "Ahmed admin can update activities" on public.activities;
drop policy if exists "Ahmed admin can delete activities" on public.activities;

create policy "Authenticated users can submit activities"
  on public.activities
  for insert
  to authenticated
  with check (
    auth.uid() = submitted_by
    and (
      lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg'
      or exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'stakeholder')
      )
    )
  );

create policy "Users can read their own activities"
  on public.activities
  for select
  to authenticated
  using (auth.uid() = submitted_by);

create policy "Authenticated users can read approved activities"
  on public.activities
  for select
  to authenticated
  using (approval_status = 'approved');

create policy "Ahmed admin can read all activities"
  on public.activities
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg');

create policy "Ahmed admin can update activities"
  on public.activities
  for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg')
  with check (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg');

create policy "Ahmed admin can delete activities"
  on public.activities
  for delete
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ahmed.bahrawy@hu.edu.eg');

create index if not exists activities_approval_status_idx on public.activities (approval_status);
create index if not exists activities_village_idx on public.activities (village);
create index if not exists activities_activity_type_idx on public.activities (activity_type);
create index if not exists profiles_role_idx on public.profiles (role);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

update public.profiles
set role = 'admin', updated_at = now()
where lower(email) = 'ahmed.bahrawy@hu.edu.eg';
