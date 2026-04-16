# OSSCAr Methodology

This directory contains the scoring pipeline used to compute the OSS Growth Index rankings. The methodology is designed to be fully reproducible: given the same input data, it produces identical results.

**Current version:** v6 (log-minmax scoring with sum-based composite)

## How it works

1. **Filter** to GitHub organizations only (done upstream in the data collection step)
2. **Assign divisions**: emerging (<1,000 stars) and scaling (>=1,000 stars)
3. **Aggregate package downloads**: npm + PyPI + Cargo combined into one metric
4. **Compute growth rates** with padding thresholds to prevent distortion at small baselines
5. **Score** each metric via log(1 + growth_rate), then min-max scale to [0, 100]
6. **Composite score** = sum of eligible metric scores (breadth-rewarding)
7. **Rank** within each division by composite score

For a detailed explanation, see [docs/methodology.md](../docs/methodology.md) or the [methodology page](https://osscar.dev/methodology) on the website.

## Quick start: reproduce rankings

### 1. Download the base data

From the latest GitHub Release:

```bash
gh release download v2026.Q1 -p "base_data_Q1_2026.csv"
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the pipeline

```bash
python compute_index.py --input base_data_Q1_2026.csv --output-dir results/
```

### 4. Compare with published rankings

```bash
diff results/oss_growth_index_above_1000_Q12026.csv \
     ../frontend/data/oss_growth_index_above_1000_Q12026_top200_clean.csv
```

## Running tests

```bash
python -m pytest
```

Tests use a small fixture dataset in `fixtures/` to verify scoring correctness without requiring the full dataset.

## Key configuration

These constants at the top of `compute_index.py` control the methodology:

| Constant | Value | Description |
|----------|-------|-------------|
| `METHODOLOGY_VERSION` | `v6` | Version identifier for this methodology |
| `DIVISION_STARS_THRESHOLD` | `1000` | Star count boundary between divisions |
| `GROWTH_SCORE_TRANSFORM` | `log_minmax` | Scoring function applied to growth rates |
| `WEIGHTING_MODE` | `sum` | How metric scores are aggregated |

### Padding thresholds

| Metric | Below 1,000 | Above 1,000 |
|--------|-------------|-------------|
| GitHub stars | 100 | 1,000 |
| Contributors | 5 | 10 |
| Package downloads | 1,000 | 10,000 |
