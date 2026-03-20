export type OrgEntry = {
  company_id: string;
  company_name: string;
  company_type: string;
  homepage_url: string | null;
  github_owner_url: string | null;
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

  huggingface_downloads_start: number | null;
  huggingface_downloads_end: number | null;
  huggingface_downloads_growth_rate: number | null;
  huggingface_downloads_growth_percentile: number | null;
  huggingface_downloads_final_weight: number | null;

  huggingface_likes_start: number | null;
  huggingface_likes_end: number | null;
  huggingface_likes_growth_rate: number | null;
  huggingface_likes_growth_percentile: number | null;
  huggingface_likes_final_weight: number | null;

  country: string | null;
  description: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
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
  country: string | null;
  homepage_url: string | null;
  repositories: RepoEntry[];
  github_stars_weekly: TimeSeriesPoint[];
  github_contributors_weekly: TimeSeriesPoint[];
  npm_weekly: TimeSeriesPoint[];
  pypi_weekly: TimeSeriesPoint[];
  huggingface_monthly: TimeSeriesPoint[];
};
