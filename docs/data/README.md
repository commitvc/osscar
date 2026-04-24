# OSSCAR Data

The OSS Growth Index publishes all data openly under the [CC BY 4.0 license](../../LICENSE-DATA).

## What's available

### In the repository

The [`frontend/data/`](../../frontend/data/) directory contains the **top 100 organizations per division** for the current quarter, one JSON file per division. These are the files that power the website:

- `osscar_emerging_top100_Q1_2026.json` — Top 100 emerging orgs (`stars_start < 1,000`)
- `osscar_scaling_top100_Q1_2026.json` — Top 100 scaling orgs (`stars_start ≥ 1,000`)

Each file is a self-contained JSON array where every record carries the ranking columns, the per-metric `start`/`end`/`growth_rate`/`growth_percentile`/`final_weight` columns, and the enrichment data the org detail pages need (weekly time series for each metric plus per-repository info). Both the ranking table and the org detail pages read from the same file — this replaces the earlier three-file layout (two ranking CSVs + a separate enrichment CSV).

These JSON files are produced by [`methodology/extract_frontend_data.py`](../../methodology/extract_frontend_data.py) from the full ranking parquet. The top-N count and quarter label are configured at the top of [`frontend/src/lib/config.ts`](../../frontend/src/lib/config.ts).

### In GitHub Releases

Each quarterly release publishes the **full dataset** (every tracked organization, not just the top 100) as Parquet assets:

| File | Description |
|---|---|
| `osscar_input_data_Q1_2026.parquet` | Raw input data for every tracked organization — the file the scoring pipeline consumes |
| `osscar_ranking_Q1_2026.parquet` | Full ranking output: input columns + `division`, `division_rank`, and per-metric `growth_rate` / `growth_percentile` / `final_weight` |

Parquet is used for its compact, strongly-typed encoding.

## How to download

Using the GitHub CLI, download the input parquet into the conventional location expected by the scoring pipeline:

```bash
mkdir -p methodology/data
gh release download v2026.Q1 \
    -p "osscar_input_data_Q1_2026.parquet" \
    -D methodology/data/
```

The `methodology/data/` directory is gitignored and is where [`methodology/compute_index.py`](../../methodology/compute_index.py) looks for input by default. To also download the published rankings so you can compare against your reproduction:

```bash
gh release download v2026.Q1 -p "osscar_ranking_Q1_2026.parquet"
```

Or download directly from the [Releases page](../../releases).

## Reproducing the rankings

Once the input parquet is in `methodology/data/`, run the pipeline from the repo root:

```bash
pip install -r methodology/requirements.txt
python methodology/compute_index.py
```

This produces `methodology/results/osscar_ranking_Q1_2026.parquet`, which should match the published `osscar_ranking_Q1_2026.parquet` release asset given the same input.

To regenerate the per-division JSON files consumed by the frontend:

```bash
python methodology/extract_frontend_data.py
```

This reads `methodology/results/osscar_ranking_Q1_2026.parquet` and writes the JSON files into `frontend/data/`. See [`methodology/README.md`](../../methodology/README.md) for details on flags and configuration.

## Schema

See [SCHEMA.md](SCHEMA.md) for column definitions of every published file.

## How the data is generated

1. **Data collection** — Weekly metrics are collected for GitHub organizations and their packages. See [data-collection.md](../data-collection.md).
2. **Scoring pipeline** — [`methodology/compute_index.py`](../../methodology/compute_index.py) reads the input parquet, computes growth rates, scores, and rankings, and writes the ranking parquet. See [methodology.md](../methodology.md).
3. **Frontend extraction** — [`methodology/extract_frontend_data.py`](../../methodology/extract_frontend_data.py) extracts the top 100 per division as JSON bundles.
4. **Publishing** — Per-division JSON files are committed to the repo; the full input and ranking parquets are attached to the GitHub Release.

## License

All data is licensed under [CC BY 4.0](../../LICENSE-DATA). You are free to use, share, and adapt the data for any purpose, including commercially, as long as you provide attribution.

Attribution example: *"Data from the OSSCAR Index by Supabase and >commit (https://github.com/commitvc/osscar)"*
