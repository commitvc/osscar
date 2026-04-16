# Data Schema

## Rankings files

Files: `oss_growth_index_{above,below}_1000_Q*_top200_clean.csv`

These files contain the scored and ranked organizations for each division.

| Column | Type | Description |
|--------|------|-------------|
| `owner_id` | string | GitHub organization ID |
| `owner_login` | string | GitHub organization login (e.g., `supabase`) |
| `owner_name` | string | Display name of the organization |
| `owner_url` | string | GitHub profile URL |
| `homepage_url` | string | Organization's website URL (nullable) |
| `owner_description` | string | GitHub organization bio (nullable) |
| `owner_logo` | string | URL to the organization's avatar image |
| `quarter_start` | date | Start date of the measurement quarter (e.g., `2026-01-01`) |
| `quarter_end` | date | End date of the measurement quarter (e.g., `2026-04-01`) |
| `github_stars_start` | integer | Total GitHub stars at quarter start |
| `github_stars_end` | integer | Total GitHub stars at quarter end |
| `github_stars_growth_rate` | float | Growth rate for stars (padded). `(end - padded_start) / padded_start` |
| `github_stars_growth_percentile` | float | Percentile rank of growth rate within the division (0-100) |
| `github_stars_final_weight` | float | Weight used in composite score (1.0 in sum mode) |
| `github_contributors_start` | integer | Total unique contributors at quarter start |
| `github_contributors_end` | integer | Total unique contributors at quarter end |
| `github_contributors_growth_rate` | float | Growth rate for contributors (padded) |
| `github_contributors_growth_percentile` | float | Percentile rank within division (0-100) |
| `github_contributors_final_weight` | float | Weight used in composite score |
| `package_downloads_start` | integer | Combined npm + PyPI + Cargo downloads at quarter start (nullable) |
| `package_downloads_end` | integer | Combined downloads at quarter end (nullable) |
| `package_downloads_growth_rate` | float | Growth rate for downloads (padded, nullable) |
| `package_downloads_growth_percentile` | float | Percentile rank within division (nullable) |
| `package_downloads_final_weight` | float | Weight used in composite score (nullable) |

### Notes on growth rates

- **Padding**: Growth rates are computed against a padded start value: `max(actual_start, padding_threshold)`. This prevents small absolute changes at low baselines from producing misleadingly high growth rates.
- **Eligibility**: An organization is eligible for a metric only if both start and end values exist, the end value meets the padding threshold, and growth is non-negative.
- **Nullable fields**: Package download columns are null for organizations that don't publish to npm, PyPI, or Cargo.

## Frontend enrichment file

File: `oss_index_prototype_frontend_data.csv`

This file contains additional data used by the org detail pages on the website.

| Column | Type | Description |
|--------|------|-------------|
| `owner_id` | string | GitHub organization ID |
| `owner_login` | string | GitHub organization login |
| `name` | string | Display name |
| `description` | string | Organization description (nullable) |
| `github_url` | string | GitHub profile URL |
| `logo_url` | string | Avatar URL (nullable) |
| `homepage_url` | string | Website URL (nullable) |
| `repositories` | JSON string | Array of repository objects (see below) |
| `github_stars_weekly` | JSON string | Array of `{date, value}` points — cumulative weekly star counts |
| `github_contributors_weekly` | JSON string | Array of `{date, value}` points — cumulative weekly contributor counts |
| `npm_weekly` | JSON string | Array of `{date, value}` points — weekly npm download counts |
| `pypi_weekly` | JSON string | Array of `{date, value}` points — weekly PyPI download counts |
| `cargo_weekly` | JSON string | Array of `{date, value}` points — weekly Cargo download counts |
| `docker_weekly` | JSON string | Array of `{date, value}` points — weekly Docker pull counts |

### Repository object schema

Each element in the `repositories` JSON array:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Repository URL |
| `name` | string | Repository name |
| `forks` | integer | Fork count |
| `stars` | integer | Star count |
| `license` | string | License identifier (nullable) |
| `language` | string | Primary language (nullable) |
| `description` | string | Repository description (nullable) |

### Time series point schema

Each element in the weekly JSON arrays:

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | ISO date (e.g., `2026-01-06`) |
| `value` | number | Metric value at that point |

## Base data (full dataset, in GitHub Releases)

The base data CSV (`base_data_Q*_*.csv`) contains the raw input data before scoring. It includes all the columns above plus per-registry download columns:

| Column | Type | Description |
|--------|------|-------------|
| `npm_downloads_start` | integer | npm downloads at quarter start (nullable) |
| `npm_downloads_end` | integer | npm downloads at quarter end (nullable) |
| `pypi_downloads_start` | integer | PyPI downloads at quarter start (nullable) |
| `pypi_downloads_end` | integer | PyPI downloads at quarter end (nullable) |
| `cargo_downloads_start` | integer | Cargo downloads at quarter start (nullable) |
| `cargo_downloads_end` | integer | Cargo downloads at quarter end (nullable) |

These per-registry columns are aggregated into `package_downloads_start` and `package_downloads_end` by the scoring pipeline.
