# scripts/

Operator scripts run from a developer laptop. Not deployed.

## One-time setup

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r methodology/requirements.txt -r scripts/requirements.txt

cp scripts/.env.example scripts/.env
# Paste SUPABASE_SERVICE_ROLE_KEY into scripts/.env
# (Supabase dashboard → Project Settings → API → service_role, secret)
```

## Ingest a quarterly ranking

```bash
python scripts/ingest_quarter.py \
    --parquet methodology/results/osscar_ranking_Q2_2026.parquet \
    --quarter-id Q2_2026 \
    --quarter-label "Q2 2026" \
    --quarter-start 2026-04-01 \
    --quarter-end 2026-06-30 \
    --make-current
```

What it does:
1. Reads and validates the full ranking parquet.
2. Upserts a row into `quarters`.
3. Replaces that quarter's rows in `organizations_full` in 1000-row batches. Re-runs do not leave stale rows from older parquet versions.
4. With `--make-current`, flips `is_current` to the new quarter so `/api/request-score` queries it.

Use `--dry-run` to validate the parquet without writing anything.

Quarter IDs use `Q*_YYYY` format (`Q1_2026`, `Q2_2026`). Quarter date
arguments must match the ranking parquet and the `quarters` row exactly; the
public schema treats `quarter_end` as inclusive (for example, Q2 2026 uses
`2026-06-30`).

Before flipping a quarter to current, run the full data and frontend release
gate in [docs/release-checks.md](../docs/release-checks.md).
