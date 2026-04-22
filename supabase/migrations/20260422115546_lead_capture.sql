-- Lead-capture feature: "Get your org's score by email"
--
-- Three tables:
--   quarters            — registry of published quarters; exactly one is_current
--   organizations_full  — full per-quarter rankings (tens of thousands of rows)
--   score_requests      — captured leads (email + requested org)
--
-- RLS is enabled on all three tables with no policies, which means the anon
-- and authenticated roles are denied by default. The service role bypasses
-- RLS and is used by the server-side ingest script + future /api/request-score
-- route.

-- --------------------------------------------------------------------------
-- Extensions
-- --------------------------------------------------------------------------
create extension if not exists citext with schema extensions;

-- --------------------------------------------------------------------------
-- quarters
-- --------------------------------------------------------------------------
create table public.quarters (
  id             text        primary key,
  label          text        not null,
  quarter_start  date        not null,
  quarter_end    date        not null,
  is_current     boolean     not null default false,
  published_at   timestamptz not null default now()
);

comment on table public.quarters is
  'Registry of published OSSCAR quarters. Exactly one row has is_current = true.';

-- Enforce exactly-one current quarter
create unique index quarters_is_current_uniq
  on public.quarters ((is_current))
  where is_current;

-- --------------------------------------------------------------------------
-- organizations_full
-- --------------------------------------------------------------------------
create table public.organizations_full (
  id                                    bigserial         primary key,
  quarter_id                            text              not null references public.quarters(id) on delete cascade,

  -- identity
  owner_id                              text              not null,
  owner_login                           text              not null,
  owner_name                            text,
  owner_url                             text,
  owner_logo                            text,
  homepage_url                          text,
  owner_description                     text,

  -- division + precomputed rank
  division                              text              not null check (division in ('emerging','scaling')),
  division_rank                         integer           not null,
  division_size                         integer           not null,

  -- stars block
  github_stars_start                    double precision,
  github_stars_end                      double precision,
  github_stars_growth_rate              double precision,
  github_stars_growth_percentile        double precision,
  github_stars_final_weight             double precision,

  -- contributors block
  github_contributors_start             double precision,
  github_contributors_end               double precision,
  github_contributors_growth_rate       double precision,
  github_contributors_growth_percentile double precision,
  github_contributors_final_weight      double precision,

  -- package downloads block (combined npm + pypi + cargo)
  package_downloads_start               double precision,
  package_downloads_end                 double precision,
  package_downloads_growth_rate         double precision,
  package_downloads_growth_percentile   double precision,
  package_downloads_final_weight        double precision
);

comment on table public.organizations_full is
  'Full per-quarter rankings for all organizations. Queried by the /api/request-score endpoint.';

-- Primary upsert key: one row per (quarter, org)
create unique index organizations_full_quarter_owner_uniq
  on public.organizations_full (quarter_id, owner_id);

-- Fast case-insensitive lookup by GitHub login (used by the email endpoint)
create unique index organizations_full_quarter_login_uniq
  on public.organizations_full (quarter_id, lower(owner_login));

-- Convenience index for paginated per-division reads (future admin views)
create index organizations_full_quarter_division_rank
  on public.organizations_full (quarter_id, division, division_rank);

-- --------------------------------------------------------------------------
-- score_requests (lead capture)
-- --------------------------------------------------------------------------
create table public.score_requests (
  id                   bigserial         primary key,
  created_at           timestamptz       not null default now(),

  email                extensions.citext not null,
  org_input            text              not null,
  normalized_login     text,

  matched_owner_id     text,
  matched_quarter_id   text              references public.quarters(id),

  status               text              not null check (status in ('sent','not_found','rate_limited','invalid_input','error')),
  ip_hash              text,
  user_agent           text
);

comment on table public.score_requests is
  'Lead-capture log. One row per /api/request-score submission.';

create index score_requests_email_created
  on public.score_requests (email, created_at desc);

create index score_requests_login_created
  on public.score_requests (normalized_login, created_at desc);

create index score_requests_ip_hash_created
  on public.score_requests (ip_hash, created_at desc);

-- --------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------
-- Enable RLS on all three tables. We add no policies, which means anon and
-- authenticated roles see nothing. The service-role key (used only server-side)
-- bypasses RLS.
alter table public.quarters           enable row level security;
alter table public.organizations_full enable row level security;
alter table public.score_requests     enable row level security;
