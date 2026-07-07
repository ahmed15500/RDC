alter table public.financial_projects
add column if not exists start_year integer,
add column if not exists end_year integer,
add column if not exists total_budget_eur numeric(14, 2),
add column if not exists annual_amount_eur numeric(14, 2);

update public.financial_projects
set
  start_year = coalesce(start_year, project_year),
  end_year = coalesce(end_year, project_year),
  total_budget_eur = coalesce(total_budget_eur, amount_eur),
  annual_amount_eur = coalesce(annual_amount_eur, 0)
where
  start_year is null
  or end_year is null
  or total_budget_eur is null
  or annual_amount_eur is null;

create index if not exists financial_projects_year_range_idx
on public.financial_projects (start_year, end_year);
