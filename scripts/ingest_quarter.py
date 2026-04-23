#!/usr/bin/env python3
"""
Ingest a full quarterly OSSCAR ranking parquet into Supabase.

Example:

    python scripts/ingest_quarter.py \\
        --parquet /Users/alessadro/Developer/osscar/methodology/results/osscar_ranking_Q1_2026.parquet \\
        --quarter-id Q12026 \\
        --quarter-label "Q1 2026" \\
        --quarter-start 2026-01-01 \\
        --quarter-end 2026-03-31 \\
        --make-current

Env (loaded from scripts/.env):
    SUPABASE_URL                 — https://<project-ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY    — secret key from Project Settings → API
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from supabase import Client, create_client

BATCH_SIZE = 1000

# Columns we pull from the parquet (must match organizations_full schema,
# minus quarter_id + division_size which we add per row).
ORG_COLUMNS = [
    "owner_id", "owner_login", "owner_name", "owner_url", "owner_logo",
    "homepage_url", "owner_description",
    "division", "division_rank",
    "github_stars_start", "github_stars_end",
    "github_stars_growth_rate", "github_stars_growth_percentile",
    "github_stars_final_weight",
    "github_contributors_start", "github_contributors_end",
    "github_contributors_growth_rate", "github_contributors_growth_percentile",
    "github_contributors_final_weight",
    "package_downloads_start", "package_downloads_end",
    "package_downloads_growth_rate", "package_downloads_growth_percentile",
    "package_downloads_final_weight",
]
INT_COLUMNS = {"division_rank"}


def sanitize(value):
    """Pandas NaN → None, numpy scalar → native Python."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if hasattr(value, "item"):
        value = value.item()
        if isinstance(value, float) and math.isnan(value):
            return None
    return value


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingest OSSCAR quarterly ranking into Supabase.")
    p.add_argument("--parquet", required=True, type=Path,
                   help="Path to the full ranking parquet.")
    p.add_argument("--quarter-id", required=True,
                   help='Compact quarter id, e.g. "Q12026".')
    p.add_argument("--quarter-label", required=True,
                   help='Display label, e.g. "Q1 2026".')
    p.add_argument("--quarter-start", required=True,
                   help="Quarter start date (YYYY-MM-DD).")
    p.add_argument("--quarter-end", required=True,
                   help="Quarter end date (YYYY-MM-DD).")
    p.add_argument("--make-current", action="store_true",
                   help="Flip is_current to this quarter after a successful load.")
    p.add_argument("--dry-run", action="store_true",
                   help="Parse and validate, but do not write to Supabase.")
    return p.parse_args()


def load_client() -> Client:
    script_env = Path(__file__).resolve().parent / ".env"
    if script_env.exists():
        load_dotenv(script_env)
    else:
        load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in scripts/.env.")
    return create_client(url, key)


def main() -> None:
    args = parse_args()

    if not args.parquet.exists():
        sys.exit(f"ERROR: parquet not found at {args.parquet}")

    print(f"→ Reading {args.parquet}")
    df = pd.read_parquet(args.parquet)
    print(f"  rows: {len(df):,}, columns: {len(df.columns)}")

    missing = [c for c in ORG_COLUMNS if c not in df.columns]
    if missing:
        sys.exit(f"ERROR: parquet missing required columns: {missing}")

    divs = set(df["division"].dropna().unique())
    unknown = divs - {"emerging", "scaling"}
    if unknown:
        sys.exit(f"ERROR: unexpected division values: {unknown}")

    # Deduplicate by lowercased login: the methodology output can contain
    # multiple owner_ids for the same GitHub login (legacy vs. modern node ID
    # for a rebranded/recreated org). The unique index on
    # (quarter_id, lower(owner_login)) would reject the duplicates; we keep
    # the row with the highest OSSCAR score (sum of the three *_final_weight
    # columns), which is always the active entry.
    login_lc = df["owner_login"].str.lower()
    dup_mask = login_lc.duplicated(keep=False)
    if dup_mask.any():
        df = df.copy()
        df["_osscar_score"] = (
            df[["github_stars_final_weight",
                "github_contributors_final_weight",
                "package_downloads_final_weight"]]
            .fillna(0).sum(axis=1)
        )
        dup_groups = df[dup_mask].groupby(login_lc[dup_mask])
        print(f"  ⚠ {dup_mask.sum()} rows across {dup_groups.ngroups} logins "
              f"are duplicated by (login); keeping highest-scoring row per login:")
        for login, group in dup_groups:
            winner = group.loc[group["_osscar_score"].idxmax()]
            print(f"    {login}: keeping owner_id={winner['owner_id']} "
                  f"(division={winner['division']}, rank={int(winner['division_rank'])}, "
                  f"score={winner['_osscar_score']:.3f}); dropping "
                  f"{len(group) - 1} other(s)")
        keep_idx = df.loc[dup_mask].groupby(login_lc[dup_mask])["_osscar_score"].idxmax()
        drop_idx = df.index[dup_mask].difference(keep_idx)
        df = df.drop(index=drop_idx).drop(columns="_osscar_score")
        print(f"  after dedup: {len(df):,} rows")

    sizes = df.groupby("division").size().to_dict()
    print(f"  division sizes: {sizes}")

    # Build rows
    rows: list[dict] = []
    for rec in df[ORG_COLUMNS].to_dict(orient="records"):
        row = {col: sanitize(rec[col]) for col in ORG_COLUMNS}
        for c in INT_COLUMNS:
            if row[c] is not None:
                row[c] = int(row[c])
        row["quarter_id"] = args.quarter_id
        row["division_size"] = int(sizes[row["division"]])
        rows.append(row)

    # Sanity: required NOT NULLs
    for required in ("owner_id", "owner_login", "division", "division_rank"):
        bad = [i for i, r in enumerate(rows) if r[required] is None]
        if bad:
            sys.exit(f"ERROR: {len(bad)} rows have null {required!r}; first index: {bad[0]}")

    if args.dry_run:
        print(f"→ Dry run: would upsert {len(rows):,} rows. First row:")
        for k, v in rows[0].items():
            print(f"    {k}: {v!r}")
        return

    client = load_client()

    print(f"→ Upsert quarter {args.quarter_id}")
    client.table("quarters").upsert(
        {
            "id": args.quarter_id,
            "label": args.quarter_label,
            "quarter_start": args.quarter_start,
            "quarter_end": args.quarter_end,
        },
        on_conflict="id",
    ).execute()

    print(f"→ Upsert {len(rows):,} rows into organizations_full "
          f"(batches of {BATCH_SIZE:,})")
    total = len(rows)
    for start in range(0, total, BATCH_SIZE):
        batch = rows[start:start + BATCH_SIZE]
        client.table("organizations_full").upsert(
            batch, on_conflict="quarter_id,owner_id"
        ).execute()
        done = min(start + BATCH_SIZE, total)
        print(f"  {done:,} / {total:,}", end="\r", flush=True)
    print()

    if args.make_current:
        print(f"→ Flip is_current → {args.quarter_id}")
        # Clear any currently-current quarter first (unique partial index
        # forbids two rows with is_current=true at once).
        client.table("quarters").update({"is_current": False}).eq(
            "is_current", True
        ).execute()
        client.table("quarters").update({"is_current": True}).eq(
            "id", args.quarter_id
        ).execute()

    print("✓ Done.")


if __name__ == "__main__":
    main()
