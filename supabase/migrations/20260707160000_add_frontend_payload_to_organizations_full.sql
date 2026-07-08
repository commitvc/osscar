-- Store the frontend detail payload in Supabase so the website can read
-- published rankings from the database instead of committed JSON bundles.
--
-- Quarter metadata stays normalized in public.quarters. These columns hold
-- only the per-organization arrays that are not already represented by the
-- scalar ranking fields on public.organizations_full.

alter table public.organizations_full
  add column if not exists github_stars_weekly jsonb not null default '[]'::jsonb,
  add column if not exists github_contributors_weekly jsonb not null default '[]'::jsonb,
  add column if not exists npm_weekly jsonb not null default '[]'::jsonb,
  add column if not exists pypi_weekly jsonb not null default '[]'::jsonb,
  add column if not exists cargo_weekly jsonb not null default '[]'::jsonb,
  add column if not exists repositories jsonb not null default '[]'::jsonb;

alter table public.organizations_full
  add constraint organizations_full_github_stars_weekly_array
    check (jsonb_typeof(github_stars_weekly) = 'array'),
  add constraint organizations_full_github_contributors_weekly_array
    check (jsonb_typeof(github_contributors_weekly) = 'array'),
  add constraint organizations_full_npm_weekly_array
    check (jsonb_typeof(npm_weekly) = 'array'),
  add constraint organizations_full_pypi_weekly_array
    check (jsonb_typeof(pypi_weekly) = 'array'),
  add constraint organizations_full_cargo_weekly_array
    check (jsonb_typeof(cargo_weekly) = 'array'),
  add constraint organizations_full_repositories_array
    check (jsonb_typeof(repositories) = 'array');

comment on column public.organizations_full.github_stars_weekly is
  'Frontend chart payload: weekly cumulative GitHub stars for this organization and quarter.';
comment on column public.organizations_full.github_contributors_weekly is
  'Frontend chart payload: weekly cumulative unique GitHub contributors for this organization and quarter.';
comment on column public.organizations_full.npm_weekly is
  'Frontend chart payload: weekly npm downloads for this organization and quarter.';
comment on column public.organizations_full.pypi_weekly is
  'Frontend chart payload: weekly PyPI downloads for this organization and quarter.';
comment on column public.organizations_full.cargo_weekly is
  'Frontend chart payload: weekly Cargo downloads for this organization and quarter.';
comment on column public.organizations_full.repositories is
  'Frontend detail payload: repository list displayed on organization pages.';
