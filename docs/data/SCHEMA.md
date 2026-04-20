# Data Schema

The OSSCAr project publishes two Parquet files per quarter on GitHub Releases:

- **`osscar_input_data_Q*_*.parquet`** — raw organization metrics, the input to the scoring pipeline.
- **`osscar_ranking_Q*_*.parquet`** — the input columns passed through, plus division assignment, rank, and the derived scoring columns used by the frontend.

The repository also ships two trimmed CSVs in [`frontend/data/`](../../frontend/data/) that power the website table (top 200 orgs per division), plus a frontend enrichment CSV. Those are documented at the bottom of this file.

## Ranking parquet

File: `osscar_ranking_Q*_*.parquet` (GitHub Releases)

Contains every organization that was eligible for ranking in a given quarter. Column set = every column from the input parquet, plus the derived columns listed below.

### Derived columns added by the scoring pipeline

| Column | Type | Description |
|--------|------|-------------|
| `division` | string | `emerging` (<1,000 stars at quarter start) or `scaling` (>=1,000) |
| `division_rank` | integer | 1-based rank within the division, ordered by composite score descending |
| `package_downloads_start` | integer | Combined npm + PyPI + Cargo downloads at quarter start (nullable) — summed from per-registry columns |
| `package_downloads_end` | integer | Combined downloads at quarter end (nullable) |
| `github_stars_growth_rate` | float | Padded growth rate for stars: `(end - padded_start) / padded_start` |
| `github_stars_growth_percentile` | float | Percentile rank of growth rate within the division (0–100) |
| `github_stars_final_weight` | float | Weight used in the composite score (1.0 in sum mode) |
| `github_contributors_growth_rate` | float | Padded growth rate for contributors (nullable) |
| `github_contributors_growth_percentile` | float | Percentile rank within division (nullable) |
| `github_contributors_final_weight` | float | Weight used in composite score (nullable) |
| `package_downloads_growth_rate` | float | Padded growth rate for combined downloads (nullable) |
| `package_downloads_growth_percentile` | float | Percentile rank within division (nullable) |
| `package_downloads_final_weight` | float | Weight used in composite score (nullable) |

### Notes on growth rates

- **Padding**: Growth rates are computed against a padded start value: `max(actual_start, padding_threshold)`. This prevents small absolute changes at low baselines from producing misleadingly high growth rates.
- **Eligibility**: An organization is eligible for a metric only if both start and end values exist, the end value meets the padding threshold, and growth is non-negative.
- **Nullable fields**: Package download columns are null for organizations that don't publish to npm, PyPI, or Cargo.

## Input parquet

File: `osscar_input_data_Q*_*.parquet` (GitHub Releases)

Raw per-organization metrics for a given quarter. This is the file
`methodology/compute_index.py` consumes.

| Column | Type | Description |
|--------|------|-------------|
| `owner_id` | string | GitHub organization ID |
| `owner_login` | string | GitHub organization login (e.g., `supabase`) |
| `owner_name` | string | Display name of the organization |
| `owner_url` | string | GitHub profile URL |
| `homepage_url` | string | Organization's website URL (nullable) |
| `owner_description` | string | GitHub organization bio (nullable) |
| `owner_logo` | string | URL to the organization's avatar image |
| `quarter_start` | string | Start date of the measurement quarter (e.g., `2026-01-01`) |
| `quarter_end` | string | End date of the measurement quarter (e.g., `2026-04-01`) |
| `github_stars_start` | float | Total GitHub stars at quarter start |
| `github_stars_end` | float | Total GitHub stars at quarter end |
| `github_contributors_start` | float | Total unique contributors at quarter start |
| `github_contributors_end` | float | Total unique contributors at quarter end |
| `npm_downloads_start` | float | npm downloads at quarter start (nullable) |
| `npm_downloads_end` | float | npm downloads at quarter end (nullable) |
| `pypi_downloads_start` | float | PyPI downloads at quarter start (nullable) |
| `pypi_downloads_end` | float | PyPI downloads at quarter end (nullable) |
| `cargo_downloads_start` | float | Cargo downloads at quarter start (nullable) |
| `cargo_downloads_end` | float | Cargo downloads at quarter end (nullable) |
| `github_repo_count` | float | Number of repositories owned by the organization |
| `github_is_new_this_quarter` | bool | Whether the organization first appeared on GitHub this quarter |
| `npm_is_new_this_quarter` | bool | Whether the organization first published to npm this quarter |
| `pypi_is_new_this_quarter` | bool | Whether the organization first published to PyPI this quarter |
| `cargo_is_new_this_quarter` | bool | Whether the organization first published to Cargo this quarter |
| `github_stars_weekly` | list<struct> | Weekly star time series — array of `{date, value}` points |
| `github_contributors_weekly` | list<struct> | Weekly contributor time series |
| `npm_weekly` | list<struct> | Weekly npm download time series |
| `pypi_weekly` | list<struct> | Weekly PyPI download time series |
| `cargo_weekly` | list<struct> | Weekly Cargo download time series |

### Weekly time-series point schema

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | ISO date (e.g., `2026-01-06`) |
| `value` | number | Metric value at that point |

## In-repo ranking CSVs (frontend)

Files: `frontend/data/oss_growth_index_{above,below}_1000_Q*_top200_clean.csv`

Top-200 trimmed subsets of the ranking parquet, in CSV form, committed to the
repo so the statically-generated frontend can read them without any release
dependency. Columns mirror the ranking parquet: org identity fields,
`*_start`/`*_end` for each metric, and the derived `growth_rate` /
`growth_percentile` / `final_weight` columns.

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

