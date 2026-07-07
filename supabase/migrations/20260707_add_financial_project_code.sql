alter table public.financial_projects
add column if not exists project_code text;

create unique index if not exists financial_projects_project_code_unique
on public.financial_projects (project_code)
where project_code is not null and project_code <> '';
