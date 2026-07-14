create table if not exists public.village_map_edits (
  village_name text primary key,
  translate_x numeric not null default 0,
  translate_y numeric not null default 0,
  scale numeric not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint village_map_edits_scale_check check (scale between 0.5 and 2.0),
  constraint village_map_edits_translate_x_check check (translate_x between -250 and 250),
  constraint village_map_edits_translate_y_check check (translate_y between -250 and 250)
);

alter table public.village_map_edits enable row level security;

drop policy if exists "Authenticated users can read village map edits" on public.village_map_edits;
create policy "Authenticated users can read village map edits"
on public.village_map_edits
for select
to authenticated
using (true);

drop policy if exists "RDC admins can insert village map edits" on public.village_map_edits;
create policy "RDC admins can insert village map edits"
on public.village_map_edits
for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "RDC admins can update village map edits" on public.village_map_edits;
create policy "RDC admins can update village map edits"
on public.village_map_edits
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "RDC admins can delete village map edits" on public.village_map_edits;
create policy "RDC admins can delete village map edits"
on public.village_map_edits
for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmed.bahrawy@hu.edu.eg'
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'village_map_edits'
  ) then
    alter publication supabase_realtime add table public.village_map_edits;
  end if;
end;
$$;
