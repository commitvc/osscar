# OSSCAr Data

The OSS Growth Index publishes all data openly under the [CC BY 4.0 license](../../LICENSE-DATA).

## What's available

### In the repository

The `frontend/data/` directory contains the **top 200 organizations per division** for the current quarter. These are the CSVs that power the website:

- `oss_growth_index_above_1000_Q12026_top200_clean.csv` — Top 200 scaling orgs (>=1,000 stars)
- `oss_growth_index_below_1000_Q12026_top200_clean.csv` — Top 200 emerging orgs (<1,000 stars)
- `oss_index_prototype_frontend_data.csv` — Enriched data with time series and repository info

### In GitHub Releases

Each quarterly release publishes the **full dataset** (all organizations, not just the top 200) as Parquet assets:

| File | Description |
|------|-------------|
| `osscar_input_data_Q1_2026.parquet` | Raw input data for every tracked organization — the file the scoring pipeline consumes |
| `osscar_ranking_Q1_2026.parquet` | Full ranking output: input columns + `division`, `division_rank`, and per-metric `growth_rate` / `growth_percentile` / `final_weight` |

Parquet is used throughout for its compact, strongly-typed encoding (arrays of
weekly time-series points are preserved as native list columns instead of JSON
strings).

## How to download

Using the GitHub CLI, download the input parquet into the conventional
location expected by the scoring pipeline:

```bash
mkdir -p methodology/data
gh release download v2026.Q1 \
    -p "osscar_input_data_Q1_2026.parquet" \
    -D methodology/data/
```

The `methodology/data/` directory is gitignored and is where
`methodology/compute_index.py` looks for input by default. To also download the
published rankings so you can compare against your reproduction:

```bash
gh release download v2026.Q1 -p "osscar_ranking_Q1_2026.parquet"
```

Or download directly from the [Releases page](../../releases).

## Reproducing the rankings

Once the input parquet is in `methodology/data/`, run the pipeline from the
repo root:

```bash
pip install -r methodology/requirements.txt
python methodology/compute_index.py
```

This produces `methodology/results/osscar_ranking_Q1_2026.parquet`, which
should match the published `osscar_ranking_Q1_2026.parquet` release asset
byte-for-byte given the same input. See
[`methodology/README.md`](../../methodology/README.md) for details on flags and
configuration.

## Schema

See [SCHEMA.md](SCHEMA.md) for detailed column definitions.

## How the data is generated

1. **Data collection** — Historical metrics are collected for GitHub organizations (see [data-collection.md](../data-collection.md))
2. **Scoring pipeline** — The [methodology](../../methodology/) pipeline computes growth rates, scores, and rankings
3. **Publishing** — Top 200 CSVs are committed to the repo; full dataset is attached to the GitHub Release

## License

All data is licensed under [CC BY 4.0](../../LICENSE-DATA). You are free to use, share, and adapt the data for any purpose, including commercially, as long as you provide attribution.

Attribution example: *"Data from the OSS Growth Index by Supabase and >commit (https://github.com/[org]/osscar)"*
