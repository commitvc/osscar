# Changelog

All notable changes to the OSS Growth Index are documented here. Each quarterly release includes methodology, data, and frontend changes.

## Q3 2026

**Release tag:** `v2026.Q3`

### Methodology

- Methodology v9 caps each signal's growth at its 99.9th percentile within the division before log-minmax scaling; equal capped scores are ordered by the uncapped score.
- GitHub stars use the active stock net of removed stars; organizations whose pre-quarter repositories lack a star baseline are not ranked, and repositories GitHub no longer resolves are left out of star counts.
- Packages linked to several repositories of one organization count once; forks and archived repositories are excluded.

### Data

- 56,079 organizations across the emerging and scaling divisions.
- Q3 2026 spans July 1 through September 30, with weekly chart buckets from July 5 through September 27.

### Frontend

- The Q3 top 100 is revealed in weekday batches from October 21 to November 2.
- Next.js 16.4.2 and sharp 0.35.5 address production security advisories.

## Q2 2026

**Release tag:** `v2026.Q2`

### Methodology

- Methodology v8 uses the first and last Sunday buckets contained in the calendar quarter for scalar growth, scoring, and chart boundaries.
- Real growth remains null when the observed start is zero; the padded baseline continues to determine ranking eligibility and score.
- Ranking multipliers shown in the website use `end / max(start, padding threshold)` and low-baseline cards disclose both ranking and observed chart endpoints.

### Data

- 48,799 organizations across the emerging and scaling divisions.
- Q2 2026 spans April 1 through June 30, with weekly chart buckets from April 5 through June 28.
- Release validation now proves the Supabase publication is field-for-field identical to the ranking Parquet.

### Frontend

- Rankings and organization detail pages load published quarters from Supabase.
- Visitors can switch between Q1 and Q2 while historical-quarter navigation remains stable.
- Desktop and mobile release checks exercise both divisions, detail pages, and every available chart signal.

## Q1 2026

**Release tag:** `v2026.Q1`

### Methodology
- Growth scores use log-minmax normalization scaled to [0, 100] (changed from raw percentiles in the previous iteration)
- Composite score via the L² norm of eligible metric scores: `√(Σ score_i²)` — breadth-rewarding, with extra weight on standout performance on a single signal
- Three signals: GitHub stars, GitHub contributors, package downloads (npm + PyPI + Cargo)
- Padding thresholds prevent small-baseline distortion

### Data
- Rankings for the top 100 organizations per division (emerging + scaling)
- Full dataset available in GitHub Releases

### Frontend
- Ranking tables for both divisions with sortable columns
- Organization detail pages with growth charts and repository listings
- Methodology page explaining the scoring pipeline
- OG image generation for social sharing
- Embeddable badge for organization pages
