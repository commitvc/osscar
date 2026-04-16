# OSS Growth Index (OSSCAr)

A quarterly ranking of the fastest-growing open-source GitHub organizations, produced by [Supabase](https://supabase.com) and [>commit](https://commit.fund).

## What is OSSCAr?

The OSS Growth Index tracks growth across GitHub stars, contributors, and package downloads (npm, PyPI, Cargo) for thousands of open-source organizations each quarter. The top 200 organizations in each division are published on the website and the full dataset is available for download.

**Two divisions:**
- **Scaling** (>=1,000 stars) — established organizations with meaningful baselines
- **Emerging** (<1,000 stars) — early-stage organizations where relative growth is more meaningful

## How rankings work

Each metric is scored on a [0, 100] scale using log-minmax normalization within each division. The composite score is the sum of all eligible metric scores (max 300), rewarding breadth of growth across multiple signals.

See the full [methodology documentation](docs/methodology.md) or explore the [scoring pipeline](methodology/).

## Data

All data is published under [CC BY 4.0](LICENSE-DATA).

**In this repository:** Top 200 rankings per division ([`frontend/data/`](frontend/data/))

**Full dataset:** Available as CSV and Parquet files in [GitHub Releases](../../releases). Download with:

```bash
gh release download v2026.Q1
```

See [docs/data/](docs/data/) for schemas and download instructions.

## Documentation

- [Methodology](docs/methodology.md) — how rankings are computed
- [Data collection](docs/data-collection.md) — how data is sourced
- [Data schema](docs/data/SCHEMA.md) — column definitions for all data files
- [Scoring pipeline](methodology/) — reproducible Python implementation

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Methodology

```bash
cd methodology
pip install -r requirements.txt
python -m pytest              # run tests
python compute_index.py       # compute rankings (requires base data)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We welcome bug reports, data quality fixes, frontend improvements, and methodology discussions.

## License

- **Code** (frontend + methodology): [MIT](LICENSE)
- **Data** (CSV files + GitHub Releases): [CC BY 4.0](LICENSE-DATA)
