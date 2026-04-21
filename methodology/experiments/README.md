# Methodology experiments

Scripts in this directory compute alternative rankings for stakeholder
review, without touching the live `compute_index.py` pipeline. Each script
writes its own ranking parquet and frontend JSON bundle.

## Run

From the repo root:

```bash
python methodology/experiments/no_normalization.py
python methodology/experiments/l2_norm.py
python methodology/experiments/l3_norm.py
python methodology/experiments/stars_boost.py
```

Each script consumes `methodology/data/osscar_input_data_Q1_2026.parquet`
and emits:

- `methodology/experiments/results/<name>/osscar_ranking_<quarter>.parquet`
- `frontend/data/experiments/<name>/osscar_{emerging,scaling}_top100_<quarter>.json`

The frontend renders each experiment at `/experiments/<slug>` (see
`frontend/src/app/experiments/[slug]/page.tsx`).

## Variants

| Script | Per-metric score | Composite |
|--------|------------------|-----------|
| `no_normalization.py` | raw padded growth rate | sum of metric growths |
| `l2_norm.py` | log(1+growth) -> min-max [0, 100] (unchanged) | `(Σ score²)^(1/2)` |
| `l3_norm.py` | same as above | `(Σ score³)^(1/3)` |
| `stars_boost.py` | same as above | `1·stars + 0.5·contributors + 0.5·packages` |
