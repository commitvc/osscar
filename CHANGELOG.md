# Changelog

All notable changes to the OSS Growth Index are documented here. Each quarterly release includes methodology, data, and frontend changes.

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
