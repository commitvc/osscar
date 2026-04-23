# scripts/

Operator scripts run from a developer laptop. Not deployed.

## One-time setup

```bash
source /Users/alessadro/Developer/osscar/methodology/.venv/bin/activate
pip install -r scripts/requirements.txt

cp scripts/.env.example scripts/.env
# Paste SUPABASE_SERVICE_ROLE_KEY into scripts/.env
# (Supabase dashboard → Project Settings → API → service_role, secret)
```

## Ingest a quarterly ranking

```bash
python scripts/ingest_quarter.py \
    --parquet /Users/alessadro/Developer/osscar/methodology/results/osscar_ranking_Q1_2026.parquet \
    --quarter-id Q12026 \
    --quarter-label "Q1 2026" \
    --quarter-start 2026-01-01 \
    --quarter-end 2026-03-31 \
    --make-current
```

What it does:
1. Reads the parquet (46k rows for Q1 2026).
2. Upserts a row into `quarters`.
3. Upserts all org rows into `organizations_full` in 1000-row batches, keyed on `(quarter_id, owner_id)`. Idempotent — safe to re-run.
4. With `--make-current`, flips `is_current` to the new quarter so `/api/request-score` queries it.

Use `--dry-run` to validate the parquet without writing anything.
