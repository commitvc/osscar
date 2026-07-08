# OSSCAR Data

The OSS Growth Index publishes all data openly under the [CC BY 4.0 license](../../LICENSE-DATA).

## What's available

### Website database

The website reads published quarters from the app-facing Supabase project:

- `quarters` stores published quarter metadata and marks the current quarter.
- `organizations_full` stores the full per-quarter ranking, scalar metric fields, weekly time-series arrays, and repository payloads used by org detail pages.

The top 100 per division is selected at request time from `organizations_full` by `(quarter_id, division, division_rank)`, which lets the site switch between published quarters without committing new frontend data files.

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

The `methodology/data/` directory is gitignored and is the conventional local drop zone for release parquets. To also download the published rankings so you can compare against your reproduction:

```bash
gh release download v2026.Q1 -p "osscar_ranking_Q1_2026.parquet"
```

Or download directly from the [Releases page](../../releases).

## Reproducing the rankings

Once the input parquet is in `methodology/data/`, run the pipeline from the repo root:

```bash
pip install -r methodology/requirements.txt
python methodology/compute_index.py \
    --input methodology/data/osscar_input_data_Q1_2026.parquet
```

This produces `methodology/results/osscar_ranking_Q1_2026.parquet`, which should match the published `osscar_ranking_Q1_2026.parquet` release asset given the same input.

To publish a quarter to the website database, validate and ingest the ranking parquet:

```bash
python scripts/ingest_quarter.py \
    --parquet methodology/results/osscar_ranking_Q1_2026.parquet \
    --quarter-id Q1_2026 \
    --quarter-label "Q1 2026" \
    --quarter-start 2026-01-01 \
    --quarter-end 2026-04-01 \
    --dry-run
```

Remove `--dry-run` only after validation passes. Add `--make-current` when the quarter is ready to become the default website quarter.

## Schema

See [SCHEMA.md](SCHEMA.md) for column definitions of every published file.

## How the data is generated

1. **Data collection** — Weekly metrics are collected for GitHub organizations and their packages. See [data-collection.md](../data-collection.md).
2. **Scoring pipeline** — [`methodology/compute_index.py`](../../methodology/compute_index.py) reads the input parquet, computes growth rates, scores, and rankings, and writes the ranking parquet. See [methodology.md](../methodology.md).
3. **Website ingest** — [`scripts/ingest_quarter.py`](../../scripts/ingest_quarter.py) validates the ranking parquet and loads the published quarter into Supabase.
4. **Publishing** — The website reads from Supabase; the full input and ranking parquets are attached to the GitHub Release.

## License

All data is licensed under [CC BY 4.0](../../LICENSE-DATA). You are free to use, share, and adapt the data for any purpose, including commercially, as long as you provide attribution.

Attribution example: *"Data from the OSSCAR Index by Supabase and >commit (https://github.com/commitvc/osscar)"*
