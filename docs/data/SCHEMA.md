# Data Schema

OSSCAR publishes three kinds of data file per quarter:

- **`osscar_input_data_Q*_*.parquet`** — the raw per-organization metrics, the input to the scoring pipeline. Attached to the GitHub Release.
- **`osscar_ranking_Q*_*.parquet`** — the input columns passed through, plus division assignment, rank, and the derived scoring columns used by the frontend. Attached to the GitHub Release.
- **`osscar_{emerging,scaling}_top100_Q*_*.json`** — per-division frontend bundles (top 100 orgs each). Committed to the repo under [`frontend/data/`](../../frontend/data/).

## Input parquet

File: `osscar_input_data_Q*_*.parquet` (GitHub Releases)

Raw per-organization metrics for a given quarter. This is the file [`methodology/compute_index.py`](../../methodology/compute_index.py) consumes.

### Scalar columns

| Column | Type | Description |
|---|---|---|
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

### Array columns

The parquet also carries weekly time-series arrays and a per-repository detail array. These are stored as JSON-encoded strings in the parquet and parsed into nested structures by downstream tooling.

| Column | Element schema | Description |
|---|---|---|
| `github_stars_weekly` | `{ date, value }` | Cumulative weekly star counts over the quarter |
| `github_contributors_weekly` | `{ date, value }` | Cumulative weekly contributor counts |
| `npm_weekly` | `{ date, value }` | Weekly npm download counts |
| `pypi_weekly` | `{ date, value }` | Weekly PyPI download counts |
| `cargo_weekly` | `{ date, value }` | Weekly Cargo download counts |
| `repositories` | see [repository object](#repository-object) | Per-repository detail for the org |

### Weekly time-series point schema

| Field | Type | Description |
|---|---|---|
| `date` | string | ISO date for the week (e.g., `2026-01-04`) |
| `value` | number | Metric value at that point |

### Repository object

Each element in the `repositories` array:

| Field | Type | Description |
|---|---|---|
| `url` | string | Repository URL |
| `name` | string | Repository name |
| `forks` | integer | Fork count at quarter end |
| `stars` | integer | Star count at quarter end |
| `stars_start` | integer | Star count at quarter start |
| `license` | string | License identifier (nullable) |
| `language` | string | Primary language (nullable) |
| `description` | string | Repository description (nullable) |

## Ranking parquet

File: `osscar_ranking_Q*_*.parquet` (GitHub Releases)

Contains every organization eligible for ranking in a given quarter. The column set is **every column from the input parquet**, plus the derived columns below. The input's array columns (weekly series, repositories) pass through unchanged.

### Derived columns added by the scoring pipeline

| Column | Type | Description |
|---|---|---|
| `division` | string | `emerging` (`stars_start < 1,000`) or `scaling` (`stars_start ≥ 1,000`) |
| `division_rank` | integer | 1-based rank within the division, ordered by composite score descending. Ties share the same rank (`pandas.rank(method="min")`). |
| `package_downloads_start` | integer | Combined npm + PyPI + Cargo downloads at quarter start (nullable) — summed from per-registry columns, treating missing registries as 0 when at least one is present |
| `package_downloads_end` | integer | Combined downloads at quarter end (nullable) |
| `github_stars_growth_rate` | float | Real growth rate for stars: `(end − start) / start` (null when start is 0) |
| `github_stars_growth_percentile` | float | Percentile rank of growth rate within the division (0–100) |
| `github_stars_final_weight` | float | Weight contributed by this metric to the composite score |
| `github_contributors_growth_rate` | float | Real growth rate for contributors (nullable) |
| `github_contributors_growth_percentile` | float | Percentile rank within division (nullable) |
| `github_contributors_final_weight` | float | Weight contributed to the composite score (nullable) |
| `package_downloads_growth_rate` | float | Real growth rate for combined downloads (nullable) |
| `package_downloads_growth_percentile` | float | Percentile rank within division (nullable) |
| `package_downloads_final_weight` | float | Weight contributed to the composite score (nullable) |

### Notes on growth rates

- **Real vs. padded rate.** The `_growth_rate` column is the **real** rate `(end − start) / start`. Padding (`max(start, padding_threshold)`) is applied internally for scoring only — it prevents low-baseline outliers from dominating ranked scores, but is never surfaced as a displayed rate. See [methodology.md](../methodology.md#step-03--measure-three-growth-signals).
- **Eligibility.** An organization is eligible for a metric only if both start and end values exist, the end value meets the padding threshold, and the padded growth rate is non-negative.
- **Nullable fields.** `_growth_rate` is null when `start` is 0 (rate undefined). Package download columns are null for organizations with no data across npm, PyPI, and Cargo.

## Per-division frontend JSON

Files: `frontend/data/osscar_{emerging,scaling}_top100_Q*_*.json`

Self-contained JSON arrays of the top 100 orgs per division, generated from the ranking parquet by [`methodology/extract_frontend_data.py`](../../methodology/extract_frontend_data.py). One file per division, one record per organization. Each record includes:

- **Identity:** `owner_id`, `owner_login`, `owner_name`, `owner_url`, `homepage_url`, `owner_description`, `owner_logo`
- **Quarter:** `quarter_start`, `quarter_end`
- **Ranking:** `division`, `division_rank`
- **Per-metric scoring:** for each of `github_stars`, `github_contributors`, `package_downloads` — `_start`, `_end`, `_growth_rate`, `_growth_percentile`, `_final_weight`
- **Enrichment for org detail pages:** `github_stars_weekly`, `github_contributors_weekly`, `npm_weekly`, `pypi_weekly`, `cargo_weekly`, `repositories`

The array columns are parsed from their JSON-string form into real JSON arrays at extraction time, so the frontend can consume them directly without further parsing. Nulls (NaN / NaT / `pandas.NA`) in the source parquet are emitted as explicit JSON `null`s.

The set of columns included is authoritatively defined by `FRONTEND_COLUMNS` at the top of [`methodology/extract_frontend_data.py`](../../methodology/extract_frontend_data.py).
