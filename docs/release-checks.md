# Quarterly Release Checks

Run these checks before flipping a new quarter to current. The goal is to catch
both bad data and bad rendering while the quarter is still reviewable through a
query parameter or preview deployment.

## 1. Install release tooling

From the repo root:

```bash
python3 -m pip install -r methodology/requirements.txt -r scripts/requirements.txt
cd frontend
npm ci
npx playwright install --with-deps chromium
```

## 2. Validate the ranking artifact

Run this against the full ranking parquet produced by
[`methodology/compute_index.py`](../methodology/compute_index.py):

```bash
python3 scripts/validate_release_data.py \
  --parquet methodology/results/osscar_ranking_Q2_2026.parquet \
  --quarter-id Q2_2026 \
  --top-n 100
```

Add `--quarter-start` and `--quarter-end` when you want the command to enforce
the exact dates expected for the release. The validator always checks the
quarter is internally consistent even when those flags are omitted.

This check fails on:

- missing columns or malformed JSON array payloads
- duplicate organizations by `owner_id` or case-insensitive `owner_login`
- invalid division values, rank gaps in the published top 100, or wrong
  `division_size` values
- derived score fields that do not recompute from the current methodology code
- negative counts, decreasing cumulative metrics, or invalid percentiles
- weekly time-series gaps, duplicate dates, out-of-quarter dates, or non-weekly
  intervals
- chart payloads whose final values do not match scalar end values
- package registry series with negative weekly download counts or missing weeks
- malformed repository payloads

## 3. Dry-run and ingest

Keep the existing ingest dry-run before writing:

```bash
python3 scripts/ingest_quarter.py \
  --parquet methodology/results/osscar_ranking_Q2_2026.parquet \
  --quarter-id Q2_2026 \
  --quarter-label "Q2 2026" \
  --quarter-start 2026-04-01 \
  --quarter-end 2026-07-01 \
  --dry-run
```

After the dry-run and artifact validation pass, ingest the quarter without
`--make-current` so it can be tested on the site through `?quarter=Q2_2026`.

## 4. Validate published Supabase rows

After ingest, validate the app-facing database rows. This reads
`scripts/.env` for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

```bash
python3 scripts/validate_release_data.py \
  --supabase \
  --quarter-id Q2_2026 \
  --top-n 100
```

This runs the same structural, time-series, and methodology recomputation checks
against `organizations_full`, with quarter dates loaded from `quarters`.

## 5. Run frontend e2e checks

Run the browser checks against the Vercel preview URL, or production if the
quarter is already queryable there:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://your-vercel-preview-url.vercel.app \
OSSCAR_RELEASE_QUARTER_ID=Q2_2026 \
OSSCAR_RELEASE_QUARTER_LABEL="Q2 2026" \
npm run release:e2e
```

The e2e checks verify:

- both `emerging` and `scaling` render a complete first page of 25 rows
- the published top count is 100 per division by default
- ranking rows expose usable organization detail links
- the top org detail page in each division renders signal, chart, and repository
  sections
- every visible chart metric toggle renders a non-empty Recharts SVG path with
  at least two active data points

The same frontend e2e checks can be run from GitHub Actions through the manual
**Release Checks** workflow by passing the preview URL and quarter id.

## 6. Flip current only after the gate passes

Only after the artifact validator, Supabase validator, and frontend e2e checks
pass should the release be made current:

```bash
python3 scripts/ingest_quarter.py \
  --parquet methodology/results/osscar_ranking_Q2_2026.parquet \
  --quarter-id Q2_2026 \
  --quarter-label "Q2 2026" \
  --quarter-start 2026-04-01 \
  --quarter-end 2026-07-01 \
  --make-current
```
