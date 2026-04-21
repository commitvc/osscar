# OSSCAr Methodology

This directory contains the scoring pipeline used to compute the OSS Growth Index rankings. The methodology is designed to be fully reproducible: given the same input data, it produces identical results.

**Current version:** v7 (log-minmax scoring with L² norm composite)

## How it works

1. **Filter** to GitHub organizations only (done upstream in the data collection step)
2. **Assign divisions**: emerging (<1,000 stars) and scaling (>=1,000 stars)
3. **Aggregate package downloads**: npm + PyPI + Cargo combined into one metric
4. **Compute growth rates** with padding thresholds to prevent distortion at small baselines
5. **Score** each metric via log(1 + growth_rate), then min-max scale to [0, 100]
6. **Composite score** = L² norm of eligible metric scores: `sqrt(Σ score_i²)` (breadth-rewarding, with extra weight on standout performance)
7. **Rank** within each division by composite score

For a detailed explanation, see [docs/methodology.md](../docs/methodology.md) or the [methodology page](https://osscar.dev/methodology) on the website.

## Quick start: reproduce rankings

### 1. Download the base data

From the latest GitHub Release into `methodology/data/` (the default input location):

```bash
mkdir -p methodology/data
gh release download v2026.Q1 \
    -p "osscar_input_data_Q1_2026.parquet" \
    -D methodology/data/
```

The `methodology/data/` directory is gitignored — it is the conventional drop
zone for quarterly input parquets downloaded from GitHub Releases.

### 2. Install dependencies

```bash
pip install -r methodology/requirements.txt
```

### 3. Run the pipeline

From the repo root:

```bash
python methodology/compute_index.py
```

This picks up `methodology/data/osscar_input_data_Q1_2026.parquet` by default
and writes `methodology/results/osscar_ranking_Q1_2026.parquet`. You can
override either side:

```bash
python methodology/compute_index.py \
    --input path/to/input.parquet \
    --output-dir path/to/out/
```

The ranking file contains every input column plus `division` (`emerging` or
`scaling`), `division_rank`, and the per-metric `growth_rate`,
`growth_percentile`, and `final_weight` columns consumed by the frontend.

## Running tests

```bash
python -m pytest
```

Tests use a small fixture dataset in `fixtures/` to verify scoring correctness without requiring the full dataset.

## Key configuration

These constants at the top of `compute_index.py` control the methodology:

| Constant | Value | Description |
|----------|-------|-------------|
| `METHODOLOGY_VERSION` | `v7` | Version identifier for this methodology |
| `DIVISION_STARS_THRESHOLD` | `1000` | Star count boundary between divisions |
| `GROWTH_SCORE_TRANSFORM` | `log_minmax` | Scoring function applied to growth rates |
| `WEIGHTING_MODE` | `l2_norm` | How metric scores are aggregated |

### Padding thresholds

| Metric | Below 1,000 | Above 1,000 |
|--------|-------------|-------------|
| GitHub stars | 100 | 1,000 |
| Contributors | 1 | 5 |
| Package downloads | 1,000 | 10,000 |
