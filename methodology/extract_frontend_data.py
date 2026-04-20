#!/usr/bin/env python3
"""Extract the top-N orgs per division as frontend-ready JSON bundles.

Reads the ranking parquet produced by `compute_index.py`, filters to the
top `FRONTEND_TOP_N` orgs in each division (by `division_rank`), selects the
columns the frontend consumes, parses the embedded JSON-string arrays into
proper nested structures, and writes one self-contained JSON file per division
to the frontend data directory.

One JSON file per division replaces the previous three-file layout
(two ranking CSVs + an enrichment CSV): both the rankings table and the org
detail pages now read from the same file.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Iterable, List

import pandas as pd


FRONTEND_TOP_N = 100
DIVISIONS = ["emerging", "scaling"]
DEFAULT_QUARTER_LABEL = "Q1_2026"

# Columns expected to hold JSON-serialized arrays in the input parquet.
JSON_ARRAY_COLUMNS = [
    "repositories",
    "github_stars_weekly",
    "github_contributors_weekly",
    "npm_weekly",
    "pypi_weekly",
    "cargo_weekly",
]

# The exact set of columns the frontend reads from each org record.
FRONTEND_COLUMNS: List[str] = [
    # Identity
    "owner_id",
    "owner_login",
    "owner_name",
    "owner_url",
    "homepage_url",
    "owner_description",
    "owner_logo",
    # Quarter
    "quarter_start",
    "quarter_end",
    # Ranking
    "division",
    "division_rank",
    # Per-metric start / end / derived scoring
    "github_stars_start",
    "github_stars_end",
    "github_stars_growth_rate",
    "github_stars_growth_percentile",
    "github_stars_final_weight",
    "github_contributors_start",
    "github_contributors_end",
    "github_contributors_growth_rate",
    "github_contributors_growth_percentile",
    "github_contributors_final_weight",
    "package_downloads_start",
    "package_downloads_end",
    "package_downloads_growth_rate",
    "package_downloads_growth_percentile",
    "package_downloads_final_weight",
    # Enrichment for org detail pages
    "github_stars_weekly",
    "github_contributors_weekly",
    "npm_weekly",
    "pypi_weekly",
    "cargo_weekly",
    "repositories",
]


def _parse_json_array(value: Any) -> list:
    """Best-effort parse of a JSON-string array column into a Python list.

    Tolerates None, NaN, empty strings, and already-parsed lists. Returns `[]`
    for anything that cannot be decoded — the frontend treats empty arrays and
    missing data the same way, so there is no value in surfacing parse errors.
    """
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, float) and math.isnan(value):
        return []
    if not isinstance(value, str):
        return []
    text = value.strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _to_json_safe(value: Any) -> Any:
    """Convert a pandas/numpy scalar into a JSON-serializable Python value.

    Nulls (NaN / NaT / pandas.NA) become `None` so the JSON output has explicit
    `null`s that the frontend's `number | null` types expect.
    """
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, (bool,)):
        return bool(value)
    if hasattr(value, "item"):  # numpy scalar
        return value.item()
    return value


def _row_to_record(row: pd.Series) -> dict:
    record: dict = {}
    for col in FRONTEND_COLUMNS:
        raw = row[col]
        if col in JSON_ARRAY_COLUMNS:
            record[col] = _parse_json_array(raw)
        else:
            record[col] = _to_json_safe(raw)
    return record


def extract_division(df: pd.DataFrame, division: str, top_n: int) -> List[dict]:
    subset = df[df["division"] == division].copy()
    subset = subset.sort_values("division_rank", ascending=True).head(top_n)
    missing = [c for c in FRONTEND_COLUMNS if c not in subset.columns]
    if missing:
        raise ValueError(
            f"Ranking parquet is missing expected frontend columns: {missing}"
        )
    return [_row_to_record(row) for _, row in subset.iterrows()]


def write_division_json(records: Iterable[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(list(records), fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def run(ranking_path: Path, output_dir: Path, top_n: int, quarter_label: str) -> list[Path]:
    df = pd.read_parquet(ranking_path)
    written: list[Path] = []
    for division in DIVISIONS:
        records = extract_division(df, division=division, top_n=top_n)
        out_path = output_dir / f"osscar_{division}_top{top_n}_{quarter_label}.json"
        write_division_json(records, out_path)
        written.append(out_path)
    return written


def default_ranking_path() -> Path:
    script_dir = Path(__file__).resolve().parent
    return script_dir / "results" / f"osscar_ranking_{DEFAULT_QUARTER_LABEL}.parquet"


def default_output_dir() -> Path:
    # frontend/data/ sits next to methodology/ at the repo root.
    return Path(__file__).resolve().parent.parent / "frontend" / "data"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract top-N-per-division JSON bundles for the frontend "
            "from the ranking parquet produced by compute_index.py."
        )
    )
    parser.add_argument(
        "--ranking",
        type=Path,
        default=default_ranking_path(),
        help="Path to the ranking parquet produced by compute_index.py.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output_dir(),
        help="Directory where the per-division JSON files are written.",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=FRONTEND_TOP_N,
        help=f"How many orgs to include per division (default: {FRONTEND_TOP_N}).",
    )
    parser.add_argument(
        "--quarter-label",
        type=str,
        default=DEFAULT_QUARTER_LABEL,
        help="Quarter label used in output filenames (default: %(default)s).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    written = run(
        ranking_path=args.ranking,
        output_dir=args.output_dir,
        top_n=args.top_n,
        quarter_label=args.quarter_label,
    )
    for path in written:
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
