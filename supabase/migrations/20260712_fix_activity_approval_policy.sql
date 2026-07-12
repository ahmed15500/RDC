-- Allow authenticated RDC administrators to update activity approval status.
-- Keeps the protected RDC admin email and supports any profile assigned admin.

drop policy if exists "Ahmed admin can update activities" on public.activities;
drop policy if exists "RDC admins can update activities" on public.activities;

create policy "RDC admins can update activities"
on public.activities
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
