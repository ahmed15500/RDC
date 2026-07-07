-- Financial users should be able to view the shared approved activity inputs.
-- This restores the original collaborative read behavior while keeping edit/delete permissions separate.

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

drop policy if exists "Users can read their own activities" on public.activities;
drop policy if exists "Non-financial users can read their own activities" on public.activities;
drop policy if exists "Authenticated users can read approved activities" on public.activities;
drop policy if exists "Non-financial users can read approved activities" on public.activities;

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
