# Methodology

This document describes the scoring methodology used in the OSS Growth Index (v7). For the executable implementation, see [`methodology/compute_index.py`](../methodology/compute_index.py).

## Overview

The OSS Growth Index measures quarterly growth across three signals for GitHub organizations:

1. **GitHub Stars** — a proxy for developer interest and awareness
2. **GitHub Contributors** — a proxy for community engagement and project health
3. **Package Downloads** — a proxy for real-world usage (npm + PyPI + Cargo combined)

Each signal produces a growth score on a [0, 100] scale. These are combined into a composite score via the L² (Euclidean) norm — `sqrt(Σ score_i²)` — which is then used for ranking.

## Step 1: Division assignment

Organizations are split into two independent leaderboards based on their GitHub star count at the start of the quarter:

| Division | Criteria | Rationale |
|----------|----------|-----------|
| **Emerging** | < 1,000 stars | Small projects where relative growth is more meaningful |
| **Scaling** | >= 1,000 stars | Established projects with meaningful baselines |

All scoring and ranking happens independently within each division. This prevents small projects with extreme relative growth from overshadowing established projects with significant absolute growth.

## Step 2: Growth rate computation

For each metric, we compute the real quarterly growth rate:

```
growth_rate = (end_value - start_value) / start_value
```

This is the rate surfaced in the published data and the UI.

### Padding thresholds (scoring only)

For scoring, we use a padded start value to prevent distortion at small baselines (e.g., going from 2 to 4 stars showing 100% growth):

```
padded_start     = max(start_value, padding_threshold)
scoring_rate     = (end_value - padded_start) / padded_start
```

The padded rate is an internal intermediate — it feeds the scoring transform and eligibility check below, but is not exposed as the displayed growth rate.

| Metric | Emerging (<1K stars) | Scaling (>=1K stars) |
|--------|---------------------|---------------------|
| GitHub Stars | 100 | 1,000 |
| Contributors | 5 | 10 |
| Package Downloads | 1,000 | 10,000 |

### Eligibility

An organization is eligible for scoring on a given metric only if:
- Both start and end values are present
- End value meets or exceeds the padding threshold
- The padded scoring rate is non-negative (we measure growth, not decline)

Organizations that don't publish packages (no npm/PyPI/Cargo data) are simply not scored on that metric — they aren't penalized.

## Step 3: Scoring (log-minmax)

Growth rates are transformed into scores on a [0, 100] scale using log-minmax normalization:

```
log_value = log(1 + growth_rate)
score = (log_value - min) / (max - min) * 100
```

Where `min` and `max` are computed within each division for each metric.

### Why log-minmax?

| Method | Problem |
|--------|---------|
| Raw percentile | Compresses all outliers to ~99th percentile — a 10x grower looks the same as a 100x grower |
| Raw log | A single extreme value compresses everyone else toward 0 |
| **Log-minmax** | Preserves outlier separation while keeping the scale bounded and comparable |

## Step 4: Composite score

The composite score is the **L² (Euclidean) norm** of all eligible metric scores — the square root of the sum of squared scores:

```
composite = sqrt(stars_score² + contributors_score² + downloads_score²)
```

Maximum possible: `sqrt(3 × 100²) ≈ 173.2` (if all three metrics score 100).

This is still **breadth-rewarding** — because per-signal scores are non-negative, adding another eligible signal can only raise the composite. But compared to a plain sum, the L² norm weights **standout performance** on a single signal more heavily: a score profile of `(100, 0, 0)` maps to `100`, while `(50, 50, 50)` maps to `≈86.6` rather than `150`. Exceptional growth on one dimension is no longer outranked by merely average growth on three.

## Step 5: Ranking

Organizations are ranked by composite score within each division. Ties are broken alphabetically by `owner_login`.

## Package download aggregation

Package downloads from multiple registries are combined before scoring:

```
package_downloads = npm_downloads + pypi_downloads + cargo_downloads
```

If an organization publishes to some registries but not others, only the available registries contribute (missing registries are treated as 0, not as disqualifying).

If an organization doesn't publish to any registry, the package download metric is null and the organization is simply not scored on this metric.
