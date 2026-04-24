# Data Collection

This document describes how OSSCAR's input data is collected and processed — from raw sources to the per-organization quarterly snapshots that feed the scoring pipeline. For the scoring methodology that runs on top of this data, see [methodology.md](methodology.md). For the published file schemas, see [data/SCHEMA.md](data/SCHEMA.md).

## Overview

| Signal | Source | Cadence | Granularity collected |
|---|---|---|---|
| GitHub stars, forks, commits, issues, releases | GitHub API | Weekly | Per repository |
| GitHub contributors | GitHub API | Weekly | Per contributor per repository |
| npm downloads | npm registry + npm downloads API | Weekly | Per package |
| PyPI downloads | BigQuery public PyPI dataset + [Pepy.tech](https://pepy.tech) | Weekly | Per package |
| Cargo downloads | crates.io API | Weekly | Per package |

All signals are collected as weekly snapshots at the repository (or package) level. For each quarterly release, the scoring pipeline reads the snapshots at the quarter start and quarter end, aggregates them up to the **organization** level, and computes growth. See [From weekly to quarterly](#from-weekly-to-quarterly).

## The repository universe

OSSCAR does not cover every repository on GitHub. The universe is a defined set that is rebuilt from the database at each run:

- **Company-linked repositories** — all public repositories owned by GitHub organizations that are linked to a tracked company.
- **Broader organization universe** — all public repositories owned by GitHub organizations created in 2015 or later.
- **Archived repositories are excluded.**
- Duplicates across the two sets are resolved in favor of the company-linked entry.

Because the universe is re-evaluated on every run, newly onboarded organizations, newly linked companies, and newly archived repositories take effect on the next weekly collection.

## Weekly windowing

All data is bucketed into weeks running **Sunday → Saturday**, stored by the Sunday start date. Only *completed* weeks are written — the in-progress week is skipped until it closes. The weekly collection runs every Monday at 00:00 UTC, so the freshest available data on any given Monday covers the week that ended the prior Saturday.

## GitHub data

### Repository metrics

**Table:** `github_repositories_weekly` — one row per `(repository, week)`.

Each week, for every repository in the universe, we fetch the activity events emitted during that week across five categories: **issues, stars, commits, releases, forks**. Those events are aggregated into a single weekly row:

| Column | Type | Description |
|---|---|---|
| `additions`, `deletions` | weekly | Lines added / removed in commits made that week |
| `commits_cum` | cumulative | All-time commit count through this week |
| `contributors_cum` | cumulative | Distinct author count (bots excluded) through this week |
| `issues_cum` | cumulative | All-time issue count through this week |
| `releases_cum` | cumulative | All-time release count through this week |
| `stars_cum` | cumulative | Star count at the end of this week |
| `forks_cum` | cumulative | Fork count at the end of this week |
| `average_time_to_issue_resolution` | weekly | Mean resolution time for issues closed that week |

The `*_cum` columns are the shape OSSCAR scoring consumes: growth = end-of-quarter cumulative minus start-of-quarter cumulative.

**Bot filtering.** Contributor counts exclude GitHub accounts whose login matches common automation patterns (suffix `[bot]`, known bot logins like `dependabot`, `renovate`, etc.). This is a heuristic — see [Limitations](#limitations).

**Data quality.** Aggregated rows are validated against a set of expectation rules (row counts, column ranges, monotonicity of cumulative columns) before being written.

### Contributor metrics

**Table:** `github_contributors_weekly` — one row per `(repository, contributor, week)`.

Commits collected for the repository metrics table are also grouped by author to produce a per-contributor-per-week commit count:

```
(repository_id, contributor_id, contributor_login, date, commits)
```

Contributors are identified by their stable GitHub `author_id` (falling back to `author_login` only when `author_id` is absent). Bots are excluded using the same heuristic as above. Contributors that haven't yet been enriched into the users reference table are held back for one cycle so they'll appear the following week.

## Package downloads

We track downloads from three package registries: **npm**, **PyPI**, and **Cargo**. All three follow the same pattern, differing only in source.

### Common shape

Each weekly run writes rows of the form:

```
(repository_id, package_name, date, company_id, downloads)
```

with a primary key of `(repository_id, package_name, date)`. One package can belong to one repository, but a single repository can publish many packages.

A companion table stores each package's **lifetime download total** at the moment it was first discovered. This is used downstream as an additional signal and is written once per package.

### Matching packages to repositories

This step determines coverage, so it is worth describing in detail. We link packages to GitHub repositories using two independent signals, combined and deduplicated:

**1. Manifest-based matching.** For each repository in the universe, we look up packages on the registry whose manifest declares this GitHub repository. Concretely, we read the `repository` URL from each candidate package's manifest (`package.json`, `pyproject.toml`, `Cargo.toml`) and confirm a match when either:

- the manifest's `repository` URL resolves to the target repo, **or**
- the manifest's `homepage`, `bugs`, or publisher/maintainer domains overlap with domains known to belong to the repository's organization or linked company.

**2. README-based matching.** A companion process parses public repository READMEs for install instructions — `npm install <pkg>`, `pip install <pkg>`, `cargo add <pkg>` — and records candidate `(repository, package)` pairs. Only pairs that are currently active are used.

The two signals are unioned and deduplicated per `(repository, package)`. A package gets linked if either signal finds it, which improves coverage for repositories that publish under different names than the repo, or whose manifests don't declare a `repository` URL.

### Per-registry sources

| Registry | Package discovery | Download counts |
|---|---|---|
| **npm** | npm registry search + README matching | Official npm downloads API |
| **PyPI** | Google BigQuery public PyPI dataset + README matching | [Pepy.tech](https://pepy.tech) |
| **Cargo** | crates.io API + README matching | crates.io API |

Package names are normalized to each registry's canonical form (lowercase, unified separators) before matching.

### Cumulative downloads

Weekly download counts are stored as reported. A running cumulative total per package is then derived via a SQL window function — so if an older week's count is revised by the upstream source, every subsequent cumulative value is recomputed automatically:

```sql
SELECT
  repository_id,
  package_name,
  date,
  downloads,
  SUM(downloads) OVER (
    PARTITION BY repository_id, package_name
    ORDER BY date
  ) AS downloads_cumulative
FROM v2.<registry>_weekly
```

## From weekly to quarterly

The tables above are collected at the **repository** level. OSSCAR rankings are published at the **organization** level and at **quarterly** cadence. Two things happen between them:

### 1. Read the snapshot at the quarter boundary

For each organization and each metric, the scoring pipeline reads the *cumulative* value at the quarter start and quarter end:

```python
start_value = value_at(quarter_start_date)   # e.g. 2026-01-01
end_value   = value_at(quarter_end_date)     # e.g. 2026-04-01
growth      = (end_value - start_value) / start_value
```

- **Stars**, **contributors**, and each **download registry** are read from the cumulative columns described above.
- The three package download registries are then summed into a single `package_downloads` series before scoring (`npm + pypi + cargo`, treating missing registries as 0 when at least one is present).

### 2. Aggregate repositories to the organization

Each metric is summed across all repositories owned by the organization at the quarter boundary:

```
org_stars(t)        = Σ repo.stars_cum(t)        over repos owned by org
org_contributors(t) = Σ repo.contributors_cum(t) over repos owned by org
org_downloads(t)    = Σ pkg.downloads_cumulative(t) over packages linked to org's repos
```

The resulting per-organization `*_start`/`*_end` columns, together with the per-quarter weekly time series, form the published input parquet `osscar_input_data_Q*_*.parquet`. See [data/SCHEMA.md](data/SCHEMA.md) for the full column list.

From there, [`methodology/compute_index.py`](../methodology/compute_index.py) handles division assignment, scoring, and ranking — described in [methodology.md](methodology.md).

## Limitations

We want to be explicit about what the data does and does not capture.

- **The universe is a defined subset of GitHub.** Repositories outside the company-linked and 2015+ organization sets are not tracked. A newly onboarded organization can take one cycle to appear.
- **Cumulative counts are forward-rolling.** If an upstream event is reported late (e.g. a star counted with a delay), future weekly cumulatives will reflect it, but historical weekly rows are not back-patched.
- **Bot filtering is heuristic.** Automation accounts whose GitHub login doesn't match common bot patterns are counted as human contributors.
- **Alt-account aliasing is not resolved.** A person who commits from both a personal and a work GitHub account is counted as two contributors.
- **Package ↔ repository matching is imperfect.** A package whose manifest doesn't declare its source repository *and* isn't referenced in its repository's README cannot be linked. Monorepos that publish many packages only show the packages we successfully matched.
- **Download counts are aggregate totals.** Registries don't separate human installs from CI pipelines, mirrors, or automated tooling. Download figures should be read as a signal of usage breadth, not unique users.
- **Third-party dependency for PyPI.** PyPI download counts come from Pepy.tech rather than being constructed from raw logs. If Pepy has downtime or changes methodology, OSSCAR's PyPI numbers shift with it.
- **Data lag at week boundaries.** Registry counts can be revised for 1–2 days after a week closes. The pipeline re-reads the most recent weeks on each run to pick up these revisions, which can cause small shifts between consecutive dataset versions.

Improvements we plan to make in future releases include better bot and automation detection, cross-registry deduplication for packages published to multiple registries under the same name, and alias resolution for contributors who use multiple GitHub accounts.
