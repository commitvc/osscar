#!/usr/bin/env python3
"""
Ingest a full quarterly OSSCAR ranking parquet into Supabase.

Example:

    python scripts/ingest_quarter.py \\
        --parquet /Users/alessadro/Developer/osscar/methodology/results/osscar_ranking_Q1_2026.parquet \\
        --quarter-id Q1_2026 \\
        --quarter-label "Q1 2026" \\
        --quarter-start 2026-01-01 \\
        --quarter-end 2026-04-01 \\
        --make-current

Env (loaded from scripts/.env):
    SUPABASE_URL                 — https://<project-ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY    — secret key from Project Settings → API
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from supabase import Client, create_client

BATCH_SIZE = 1000
QUARTER_ID_RE = re.compile(r"^Q[1-4]_\d{4}$")
DIVISIONS = {"emerging", "scaling"}

# Columns we pull from the parquet (must match organizations_full schema,
# minus quarter_id + division_size which we add per row).
SCALAR_ORG_COLUMNS = [
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
JSON_ARRAY_COLUMNS = [
    "github_stars_weekly",
    "github_contributors_weekly",
    "npm_weekly",
    "pypi_weekly",
    "cargo_weekly",
    "repositories",
]
ORG_COLUMNS = SCALAR_ORG_COLUMNS + JSON_ARRAY_COLUMNS
INT_COLUMNS = {"division_rank"}


def sanitize(value: Any) -> Any:
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


def parse_json_array(value: Any, *, column: str, row_label: str) -> list:
    if value is None:
        return []
    if isinstance(value, float) and math.isnan(value):
        return []
    try:
        if pd.isna(value):
            return []
    except (TypeError, ValueError):
        pass

    if isinstance(value, list):
        return normalize_json(value)

    if not isinstance(value, str):
        raise ValueError(
            f"{row_label}: expected {column} to be a JSON array string, got {type(value).__name__}"
        )

    text = value.strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{row_label}: malformed JSON in {column}: {exc}") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{row_label}: expected {column} JSON value to be an array")
    return normalize_json(parsed)


def normalize_json(value: Any) -> Any:
    """Convert pandas/numpy scalars inside JSON payloads to plain JSON values."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if hasattr(value, "item"):
        return normalize_json(value.item())
    if isinstance(value, list):
        return [normalize_json(v) for v in value]
    if isinstance(value, dict):
        return {str(k): normalize_json(v) for k, v in value.items()}
    return value


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingest OSSCAR quarterly ranking into Supabase.")
    p.add_argument("--parquet", required=True, type=Path,
                   help="Path to the full ranking parquet.")
    p.add_argument("--quarter-id", required=True,
                   help='Canonical quarter id, e.g. "Q1_2026".')
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


def validate_args(args: argparse.Namespace) -> None:
    if not QUARTER_ID_RE.match(args.quarter_id):
        sys.exit('ERROR: --quarter-id must match "Q1_2026" style.')


def drop_duplicate_logins(df: pd.DataFrame) -> pd.DataFrame:
    login_lc = df["owner_login"].str.lower()
    dup_mask = login_lc.duplicated(keep=False)
    if not dup_mask.any():
        return df

    df = df.copy()
    duplicate_rows = df.loc[dup_mask].copy()
    duplicate_rows["_login_lc"] = login_lc.loc[dup_mask]
    print(
        f"  WARNING: {dup_mask.sum()} rows across "
        f"{duplicate_rows['_login_lc'].nunique()} logins are duplicated by login; "
        "keeping the best-ranked row per login."
    )

    keep_indices: list[int] = []
    for login, group in duplicate_rows.groupby("_login_lc", sort=True):
        ordered = group.sort_values(
            ["division_rank", "owner_id"],
            ascending=[True, True],
            kind="mergesort",
        )
        winner = ordered.iloc[0]
        keep_indices.append(int(winner.name))
        dropped = len(group) - 1
        print(
            f"    {login}: keeping owner_id={winner['owner_id']} "
            f"(division={winner['division']}, rank={int(winner['division_rank'])}); "
            f"dropping {dropped} other(s)"
        )

    drop_idx = df.index[dup_mask].difference(keep_indices)
    return df.drop(index=drop_idx)


def build_rows(df: pd.DataFrame, quarter_id: str) -> list[dict]:
    sizes = df.groupby("division").size().to_dict()
    print(f"  division sizes: {sizes}")

    rows: list[dict] = []
    for row_index, rec in enumerate(df[ORG_COLUMNS].to_dict(orient="records")):
        row_label = f"row {row_index}"
        row: dict[str, Any] = {}
        for col in SCALAR_ORG_COLUMNS:
            row[col] = sanitize(rec[col])
        for col in JSON_ARRAY_COLUMNS:
            row[col] = parse_json_array(rec[col], column=col, row_label=row_label)
        for c in INT_COLUMNS:
            if row[c] is not None:
                row[c] = int(row[c])
        row["quarter_id"] = quarter_id
        row["division_size"] = int(sizes[row["division"]])
        rows.append(row)
    return rows


def validate_rows(rows: list[dict]) -> None:
    for required in ("owner_id", "owner_login", "division", "division_rank"):
        bad = [i for i, r in enumerate(rows) if r[required] is None]
        if bad:
            sys.exit(f"ERROR: {len(bad)} rows have null {required!r}; first index: {bad[0]}")

    for field in JSON_ARRAY_COLUMNS:
        bad = [i for i, r in enumerate(rows) if not isinstance(r[field], list)]
        if bad:
            sys.exit(f"ERROR: {len(bad)} rows have non-array {field!r}; first index: {bad[0]}")

    for division in sorted(DIVISIONS):
        division_ranks = sorted(
            r["division_rank"] for r in rows if r["division"] == division
        )
        if not division_ranks:
            sys.exit(f"ERROR: no rows for division {division!r}")
        expected = list(range(1, len(division_ranks) + 1))
        if division_ranks[:100] != expected[:100]:
            sys.exit(
                f"ERROR: first 100 ranks for division {division!r} are not contiguous 1..100"
            )


def insert_batches(client: Client, rows: list[dict]) -> None:
    total = len(rows)
    for start in range(0, total, BATCH_SIZE):
        batch = rows[start:start + BATCH_SIZE]
        client.table("organizations_full").insert(batch).execute()
        done = min(start + BATCH_SIZE, total)
        print(f"  {done:,} / {total:,}", end="\r", flush=True)
    print()


def main() -> None:
    args = parse_args()
    validate_args(args)

    if not args.parquet.exists():
        sys.exit(f"ERROR: parquet not found at {args.parquet}")

    print(f"→ Reading {args.parquet}")
    df = pd.read_parquet(args.parquet)
    print(f"  rows: {len(df):,}, columns: {len(df.columns)}")

    missing = [c for c in ORG_COLUMNS if c not in df.columns]
    if missing:
        sys.exit(f"ERROR: parquet missing required columns: {missing}")

    divs = set(df["division"].dropna().unique())
    unknown = divs - DIVISIONS
    if unknown:
        sys.exit(f"ERROR: unexpected division values: {unknown}")

    df = drop_duplicate_logins(df)
    print(f"  ingest rows after duplicate handling: {len(df):,}")

    try:
        rows = build_rows(df, args.quarter_id)
    except ValueError as exc:
        sys.exit(f"ERROR: {exc}")

    validate_rows(rows)

    if args.dry_run:
        print(f"→ Dry run: would replace {len(rows):,} rows. First row:")
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

    print(f"→ Replace organizations_full rows for {args.quarter_id}")
    client.table("organizations_full").delete().eq("quarter_id", args.quarter_id).execute()

    print(f"→ Insert {len(rows):,} rows into organizations_full "
          f"(batches of {BATCH_SIZE:,})")
    insert_batches(client, rows)

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
