-- Approved RDC data is visible to authenticated users but is read-only.
-- Stakeholders may insert activities and edit only their own pending or
-- needs-revision submissions. Administrators retain full management access.

alter table public.activities enable row level security;

-- Remove overlapping/overly broad policies before recreating the intended model.
drop policy if exists "Stakeholders can insert activities" on public.activities;
drop policy if exists "Authenticated users can submit activities" on public.activities;
drop policy if exists "Users can update own editable activities" on public.activities;
drop policy if exists "Users can read own activities" on public.activities;
drop policy if exists "Users can read their own activities" on public.activities;

create policy "Stakeholders can submit activities"
on public.activities
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and approval_status = 'pending'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'stakeholder', 'full_stakeholder')
    )
  )
);

create policy "Users can read their own activities"
on public.activities
for select
to authenticated
using (submitted_by = auth.uid());

create policy "Stakeholders can update own pending activities"
on public.activities
for update
to authenticated
using (
  submitted_by = auth.uid()
  and approval_status in ('pending', 'needs_revision')
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('stakeholder', 'full_stakeholder')
  )
)
with check (
  submitted_by = auth.uid()
  and approval_status in ('pending', 'needs_revision')
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('stakeholder', 'full_stakeholder')
  )
);
