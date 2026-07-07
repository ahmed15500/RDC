create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'viewer')
$$;

grant execute on function public.current_app_role() to authenticated;

drop policy if exists "Authenticated users can view financial projects" on public.financial_projects;
drop policy if exists "Authenticated users can insert financial projects" on public.financial_projects;
drop policy if exists "Authenticated users can update financial projects" on public.financial_projects;
drop policy if exists "Authenticated users can delete financial projects" on public.financial_projects;

create policy "Role-based financial project view"
on public.financial_projects
for select
to authenticated
using (
  public.current_app_role() in (
    'admin',
    'financial',
    'financial_stakeholder',
    'viewer',
    'full_viewer',
    'stakeholder',
    'full_stakeholder'
  )
);

create policy "Role-based financial project insert"
on public.financial_projects
for insert
to authenticated
with check (
  public.current_app_role() in ('admin', 'financial_stakeholder', 'stakeholder', 'full_stakeholder')
  and (created_by = auth.uid() or created_by is null)
);

create policy "Role-based financial project update"
on public.financial_projects
for update
to authenticated
using (
  public.current_app_role() in ('admin', 'financial_stakeholder', 'stakeholder', 'full_stakeholder')
)
with check (
  public.current_app_role() in ('admin', 'financial_stakeholder', 'stakeholder', 'full_stakeholder')
);

create policy "Role-based financial project delete"
on public.financial_projects
for delete
to authenticated
using (
  public.current_app_role() in ('admin', 'financial_stakeholder', 'stakeholder', 'full_stakeholder')
);
