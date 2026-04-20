export type Division = "emerging" | "scaling";

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

/**
 * A single organization entry — combines the ranking data the table needs
 * and the enrichment data the org detail page needs. Matches the records
 * produced by `methodology/extract_frontend_data.py`.
 */
export type Org = {
  // Identity
  owner_id: string;
  owner_login: string;
  owner_name: string;
  owner_url: string | null;
  homepage_url: string | null;
  owner_description: string | null;
  owner_logo: string | null;

  // Quarter
  quarter_start: string;
  quarter_end: string;

  // Ranking
  division: Division;
  division_rank: number;

  // Metrics — stars
  github_stars_start: number | null;
  github_stars_end: number | null;
  github_stars_growth_rate: number | null;
  github_stars_growth_percentile: number | null;
  github_stars_final_weight: number | null;

  // Metrics — contributors
  github_contributors_start: number | null;
  github_contributors_end: number | null;
  github_contributors_growth_rate: number | null;
  github_contributors_growth_percentile: number | null;
  github_contributors_final_weight: number | null;

  // Metrics — package downloads (npm + PyPI + Cargo aggregated)
  package_downloads_start: number | null;
  package_downloads_end: number | null;
  package_downloads_growth_rate: number | null;
  package_downloads_growth_percentile: number | null;
  package_downloads_final_weight: number | null;

  // Weekly time series (for the org detail chart)
  github_stars_weekly: TimeSeriesPoint[];
  github_contributors_weekly: TimeSeriesPoint[];
  npm_weekly: TimeSeriesPoint[];
  pypi_weekly: TimeSeriesPoint[];
  cargo_weekly: TimeSeriesPoint[];

  // Top repositories (for the org detail repo table)
  repositories: RepoEntry[];
};
