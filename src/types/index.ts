export type OrgEntry = {
  owner_id: string;
  owner_login: string;
  owner_name: string;
  owner_url: string | null;
  homepage_url: string | null;
  owner_description: string | null;
  owner_logo: string | null;
  quarter_start: string;
  quarter_end: string;

  github_stars_start: number | null;
  github_stars_end: number | null;
  github_stars_growth_rate: number | null;
  github_stars_growth_percentile: number | null;
  github_stars_final_weight: number | null;

  github_contributors_start: number | null;
  github_contributors_end: number | null;
  github_contributors_growth_rate: number | null;
  github_contributors_growth_percentile: number | null;
  github_contributors_final_weight: number | null;

  npm_downloads_start: number | null;
  npm_downloads_end: number | null;
  npm_downloads_growth_rate: number | null;
  npm_downloads_growth_percentile: number | null;
  npm_downloads_final_weight: number | null;

  pypi_downloads_start: number | null;
  pypi_downloads_end: number | null;
  pypi_downloads_growth_rate: number | null;
  pypi_downloads_growth_percentile: number | null;
  pypi_downloads_final_weight: number | null;

  cargo_downloads_start: number | null;
  cargo_downloads_end: number | null;
  cargo_downloads_growth_rate: number | null;
  cargo_downloads_growth_percentile: number | null;
  cargo_downloads_final_weight: number | null;

  docker_pulls_start: number | null;
  docker_pulls_end: number | null;
  docker_pulls_growth_rate: number | null;
  docker_pulls_growth_percentile: number | null;
  docker_pulls_final_weight: number | null;
};

export type Tier = "above_1000" | "below_1000";

export type RepoEntry = {
  url: string;
  name: string;
  forks: number;
  stars: number;
  license: string | null;
  language: string | null;
  description: string | null;
};

export type TimeSeriesPoint = {
  date: string;
  value: number;
};

export type FrontendOrgData = {
  github_owner_id: string;
  company_id: string;
  name: string;
  description: string | null;
  github_url: string;
  logo_url: string | null;
  github_homepage_url: string | null;
  homepage_url: string | null;
  repositories: RepoEntry[];
  github_stars_weekly: TimeSeriesPoint[];
  github_contributors_weekly: TimeSeriesPoint[];
  npm_weekly: TimeSeriesPoint[];
  pypi_weekly: TimeSeriesPoint[];
  cargo_weekly: TimeSeriesPoint[];
};
