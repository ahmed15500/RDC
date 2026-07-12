-- Allow authenticated RDC administrators to permanently delete activities.
-- This keeps the protected admin email working and also supports users whose
-- own profile is explicitly assigned the admin role.

drop policy if exists "Ahmed admin can delete activities" on public.activities;
drop policy if exists "RDC admins can delete activities" on public.activities;

create policy "RDC admins can delete activities"
on public.activities
for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
