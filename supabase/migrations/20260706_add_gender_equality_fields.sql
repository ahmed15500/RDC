alter table public.activities
  add column if not exists gender_equality_level text default 'not_assessed',
  add column if not exists female_participants integer default 0,
  add column if not exists male_participants integer default 0,
  add column if not exists women_leadership_count integer default 0,
  add column if not exists gender_equality_actions text,
  add column if not exists gender_equality_outcome text;
