# Data Collection

This document describes how the input data for the OSS Growth Index is collected and processed.

> **Note:** This document is a work in progress. More detail on specific data sources and pipelines will be added over time.

## Sources

The following data sources are collected for each GitHub organization:

| Signal | Source | Cadence |
|--------|--------|---------|
| GitHub Stars | GitHub API | Weekly snapshots |
| GitHub Contributors | GitHub API | Weekly snapshots |
| npm Downloads | npm registry API | Weekly aggregates |
| PyPI Downloads | BigQuery (pypistats) | Weekly aggregates |
| Cargo Downloads | crates.io API | Weekly aggregates |

## Scope

- **Universe:** GitHub organizations (not individual users or repositories)
- **Aggregation level:** Organization-level (all repositories under the org are combined)
- **Time period:** Quarterly (3-month windows, e.g., Q1 = January 1 to April 1)

## Processing

1. **Snapshot collection** — Weekly metric snapshots are collected for each organization
2. **Quarter boundary extraction** — Start and end values are extracted at quarter boundaries
3. **Package aggregation** — npm, PyPI, and Cargo downloads are summed into a single `package_downloads` metric
4. **Base table assembly** — All metrics are joined into a single base table per quarter
5. **Scoring** — The base table is processed by the [methodology pipeline](../methodology/) to produce rankings

## Organization identification

Organizations are identified by their GitHub `owner_id`. The `owner_login` (GitHub username) is used for display and URL routing but is not the primary key, as logins can change.

## Data quality

- Organizations with no GitHub activity data are excluded
- Download metrics are nullable — organizations that don't publish packages are not penalized
- Historical data corrections (e.g., GitHub API reporting changes) are applied when detected
