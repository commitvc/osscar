# OSSCAr Data

The OSS Growth Index publishes all data openly under the [CC BY 4.0 license](../../LICENSE-DATA).

## What's available

### In the repository

The `frontend/data/` directory contains the **top 200 organizations per division** for the current quarter. These are the CSVs that power the website:

- `oss_growth_index_above_1000_Q12026_top200_clean.csv` — Top 200 scaling orgs (>=1,000 stars)
- `oss_growth_index_below_1000_Q12026_top200_clean.csv` — Top 200 emerging orgs (<1,000 stars)
- `oss_index_prototype_frontend_data.csv` — Enriched data with time series and repository info

### In GitHub Releases

Each quarterly release includes the **full dataset** (all scored organizations, not just the top 200) as downloadable assets:

| File | Description |
|------|-------------|
| `base_data_Q1_2026.csv` | Raw input data for all organizations |
| `rankings_above_1000_Q1_2026.csv` | Full rankings for scaling division |
| `rankings_below_1000_Q1_2026.csv` | Full rankings for emerging division |
| `*.parquet` | Parquet versions of the above (smaller, typed) |

## How to download

Using the GitHub CLI:

```bash
# Download all assets from a release
gh release download v2026.Q1

# Download a specific file
gh release download v2026.Q1 -p "base_data_Q1_2026.csv"
```

Or download directly from the [Releases page](../../releases).

## Schema

See [SCHEMA.md](SCHEMA.md) for detailed column definitions.

## How the data is generated

1. **Data collection** — Historical metrics are collected for GitHub organizations (see [data-collection.md](../data-collection.md))
2. **Scoring pipeline** — The [methodology](../../methodology/) pipeline computes growth rates, scores, and rankings
3. **Publishing** — Top 200 CSVs are committed to the repo; full dataset is attached to the GitHub Release

## License

All data is licensed under [CC BY 4.0](../../LICENSE-DATA). You are free to use, share, and adapt the data for any purpose, including commercially, as long as you provide attribution.

Attribution example: *"Data from the OSS Growth Index by Supabase and >commit (https://github.com/[org]/osscar)"*
