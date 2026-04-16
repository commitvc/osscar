# Methodology

This document describes the scoring methodology used in the OSS Growth Index (v6). For the executable implementation, see [`methodology/compute_index.py`](../methodology/compute_index.py).

## Overview

The OSS Growth Index measures quarterly growth across three signals for GitHub organizations:

1. **GitHub Stars** — a proxy for developer interest and awareness
2. **GitHub Contributors** — a proxy for community engagement and project health
3. **Package Downloads** — a proxy for real-world usage (npm + PyPI + Cargo combined)

Each signal produces a growth score on a [0, 100] scale. These are summed into a composite score used for ranking.

## Step 1: Division assignment

Organizations are split into two independent leaderboards based on their GitHub star count at the start of the quarter:

| Division | Criteria | Rationale |
|----------|----------|-----------|
| **Emerging** | < 1,000 stars | Small projects where relative growth is more meaningful |
| **Scaling** | >= 1,000 stars | Established projects with meaningful baselines |

All scoring and ranking happens independently within each division. This prevents small projects with extreme relative growth from overshadowing established projects with significant absolute growth.

## Step 2: Growth rate computation

For each metric, we compute a quarterly growth rate:

```
growth_rate = (end_value - padded_start) / padded_start
```

### Padding thresholds

To prevent distortion at small baselines (e.g., going from 2 to 4 stars showing 100% growth), the start value is padded to a minimum threshold:

```
padded_start = max(actual_start, padding_threshold)
```

| Metric | Emerging (<1K stars) | Scaling (>=1K stars) |
|--------|---------------------|---------------------|
| GitHub Stars | 100 | 1,000 |
| Contributors | 5 | 10 |
| Package Downloads | 1,000 | 10,000 |

### Eligibility

An organization is eligible for scoring on a given metric only if:
- Both start and end values are present
- End value meets or exceeds the padding threshold
- Growth rate is non-negative (we measure growth, not decline)

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

The composite score is the **sum** of all eligible metric scores:

```
composite = stars_score + contributors_score + downloads_score
```

Maximum possible: 300 (if all three metrics score 100).

This is **breadth-rewarding**: an organization growing across all three signals will generally outscore one excelling on just one metric. This reflects the intuition that broad growth across multiple dimensions is a stronger signal of overall momentum.

## Step 5: Ranking

Organizations are ranked by composite score within each division. Ties are broken alphabetically by `owner_login`.

## Package download aggregation

Package downloads from multiple registries are combined before scoring:

```
package_downloads = npm_downloads + pypi_downloads + cargo_downloads
```

If an organization publishes to some registries but not others, only the available registries contribute (missing registries are treated as 0, not as disqualifying).

If an organization doesn't publish to any registry, the package download metric is null and the organization is simply not scored on this metric.
