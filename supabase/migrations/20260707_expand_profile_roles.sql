alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (
  role in (
    'admin',
    'viewer',
    'stakeholder',
    'financial',
    'financial_stakeholder',
    'full_viewer',
    'full_stakeholder'
  )
);

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
      when coalesce(new.raw_user_meta_data ->> 'role', '') in ('viewer', 'stakeholder', 'financial', 'financial_stakeholder', 'full_viewer', 'full_stakeholder') then new.raw_user_meta_data ->> 'role'
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
