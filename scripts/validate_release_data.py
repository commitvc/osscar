#!/usr/bin/env python3
"""Validate OSSCAR quarter data before or after publishing.

The validator is intentionally stricter than the website runtime. Runtime code
should render trusted release data; this script is where malformed or incomplete
quarter payloads are rejected before they become public.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Iterable

try:
    import pandas as pd
except ModuleNotFoundError as exc:  # pragma: no cover - exercised by operators
    sys.exit(
        "ERROR: pandas is required. Install release tooling dependencies with "
        "`python3 -m pip install -r methodology/requirements.txt -r scripts/requirements.txt`."
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "methodology"))

try:
    import compute_index as ci
except ModuleNotFoundError as exc:  # pragma: no cover - exercised by operators
    sys.exit(
        "ERROR: methodology dependencies are required. Install them with "
        "`python3 -m pip install -r methodology/requirements.txt`."
    )


DIVISIONS = ("emerging", "scaling")
QUARTER_ID_RE = re.compile(r"^Q([1-4])_(\d{4})$")

SCALAR_COLUMNS = [
    "owner_id",
    "owner_login",
    "owner_name",
    "owner_url",
    "owner_logo",
    "homepage_url",
    "owner_description",
    "division",
    "division_rank",
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
]

ARRAY_COLUMNS = [
    "github_stars_weekly",
    "github_contributors_weekly",
    "npm_weekly",
    "pypi_weekly",
    "cargo_weekly",
    "repositories",
]

FULL_REQUIRED_COLUMNS = [
    "quarter_start",
    "quarter_end",
    *SCALAR_COLUMNS,
    *ARRAY_COLUMNS,
]

COUNT_COLUMNS = [
    "github_stars_start",
    "github_stars_end",
    "github_contributors_start",
    "github_contributors_end",
    "package_downloads_start",
    "package_downloads_end",
]

METRIC_PREFIXES = [
    "github_stars",
    "github_contributors",
    "package_downloads",
]

TIME_SERIES_TO_METRIC = {
    "github_stars_weekly": "github_stars",
    "github_contributors_weekly": "github_contributors",
}

PACKAGE_SERIES_COLUMNS = ["npm_weekly", "pypi_weekly", "cargo_weekly"]

DB_SELECT_COLUMNS = [
    "id",
    "division_size",
    *SCALAR_COLUMNS,
    *ARRAY_COLUMNS,
]


@dataclass
class SourceData:
    label: str
    rows: list[dict[str, Any]]
    dataframe: pd.DataFrame | None = None


class Audit:
    def __init__(self, max_examples: int) -> None:
        self.max_examples = max_examples
        self.failures = 0
        self.examples: list[str] = []

    def fail(self, message: str) -> None:
        self.failures += 1
        if len(self.examples) < self.max_examples:
            self.examples.append(message)

    def assert_no_failures(self) -> None:
        if self.failures == 0:
            print("\nRelease data validation passed.")
            return

        print(f"\n{self.failures} release data validation failure(s):", file=sys.stderr)
        for message in self.examples:
            print(f"FAIL {message}", file=sys.stderr)
        hidden = self.failures - len(self.examples)
        if hidden > 0:
            print(f"... {hidden} additional failure(s) hidden", file=sys.stderr)
        sys.exit(1)


def is_null(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    if isinstance(value, (list, dict)):
        return False
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def is_number(value: Any) -> bool:
    if is_null(value) or isinstance(value, bool):
        return False
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(number)


def as_float(value: Any) -> float | None:
    if is_null(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def is_int_like(value: Any) -> bool:
    number = as_float(value)
    return number is not None and math.isclose(number, round(number), abs_tol=1e-9)


def parse_date_value(value: Any, *, label: str) -> date:
    ts = pd.to_datetime(value, errors="coerce")
    if pd.isna(ts):
        raise ValueError(f"{label}: invalid date {value!r}")
    return ts.date()


def parse_point_date(value: Any, *, label: str) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def quarter_start_from_id(quarter_id: str) -> date:
    match = QUARTER_ID_RE.match(quarter_id)
    if not match:
        raise ValueError(f"Invalid quarter id {quarter_id!r}")
    quarter = int(match.group(1))
    year = int(match.group(2))
    return date(year, (quarter - 1) * 3 + 1, 1)


def parse_json_array(value: Any, *, source: str, row_label: str, column: str) -> list:
    if is_null(value):
        return []
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        raise ValueError(
            f"{source} {row_label}: expected {column} to be a JSON array string, got {type(value).__name__}"
        )
    text = value.strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{source} {row_label}: malformed JSON in {column}: {exc}") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{source} {row_label}: expected {column} JSON value to be an array")
    return parsed


def normalized_records_from_dataframe(
    df: pd.DataFrame,
    *,
    source: str,
    audit: Audit,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row_index, record in enumerate(df.to_dict(orient="records")):
        row_label = f"row {row_index}"
        for column in ARRAY_COLUMNS:
            if column not in record:
                continue
            try:
                record[column] = parse_json_array(
                    record[column],
                    source=source,
                    row_label=row_label,
                    column=column,
                )
            except ValueError as exc:
                audit.fail(str(exc))
                record[column] = []
        records.append(record)
    return records


def load_parquet(path: Path, audit: Audit) -> SourceData:
    if not path.exists():
        audit.fail(f"{path}: parquet file does not exist")
        return SourceData(label=str(path), rows=[], dataframe=pd.DataFrame())

    df = pd.read_parquet(path)
    label = f"parquet:{path}"
    missing = [column for column in FULL_REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        audit.fail(f"{label}: missing required columns: {missing}")
    rows = normalized_records_from_dataframe(df, source=label, audit=audit)
    print(f"Loaded {label}: {len(rows):,} rows, {len(df.columns):,} columns")
    return SourceData(label=label, rows=rows, dataframe=df)


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        os.environ.setdefault(key, value)


def load_supabase_quarter(quarter_id: str, audit: Audit) -> SourceData:
    try:
        from supabase import create_client
    except ModuleNotFoundError:
        sys.exit(
            "ERROR: supabase is required for --supabase. Install it with "
            "`python3 -m pip install -r scripts/requirements.txt`."
        )

    load_env_file(REPO_ROOT / "scripts" / ".env")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for --supabase.")

    client = create_client(url, key)
    quarter_response = (
        client.table("quarters")
        .select("id, label, quarter_start, quarter_end, is_current, published_at")
        .eq("id", quarter_id)
        .limit(1)
        .execute()
    )
    quarter_rows = quarter_response.data or []
    if len(quarter_rows) != 1:
        audit.fail(f"supabase:{quarter_id}: expected one quarters row, got {len(quarter_rows)}")
        return SourceData(label=f"supabase:{quarter_id}", rows=[], dataframe=pd.DataFrame())

    quarter = quarter_rows[0]
    rows: list[dict[str, Any]] = []
    page_size = 1000
    start = 0
    while True:
        response = (
            client.table("organizations_full")
            .select(", ".join(DB_SELECT_COLUMNS))
            .eq("quarter_id", quarter_id)
            .order("id", desc=False)
            .range(start, start + page_size - 1)
            .execute()
        )
        batch = response.data or []
        if not batch:
            break
        for row in batch:
            row["quarter_start"] = quarter["quarter_start"]
            row["quarter_end"] = quarter["quarter_end"]
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size

    df = pd.DataFrame(rows)
    label = f"supabase:{quarter_id}"
    print(f"Loaded {label}: {len(rows):,} organizations_full rows")
    return SourceData(label=label, rows=rows, dataframe=df)


def require_fields(
    audit: Audit,
    *,
    source: str,
    row_label: str,
    record: dict[str, Any],
    fields: Iterable[str],
) -> bool:
    missing = [field for field in fields if field not in record]
    if missing:
        audit.fail(f"{source} {row_label}: missing required fields: {missing}")
        return False
    return True


def validate_series(
    audit: Audit,
    *,
    source: str,
    row_label: str,
    field: str,
    series: Any,
    quarter_start: date,
    quarter_end: date,
    start_value: float | None,
    end_value: float | None,
    require_when_end_present: bool,
    fail_when_end_absent: bool,
    compare_last_to_end: bool,
    require_monotone: bool,
) -> list[tuple[date, float]]:
    if not isinstance(series, list):
        audit.fail(f"{source} {row_label}: {field} is not an array")
        return []

    if end_value is not None and end_value > 0 and require_when_end_present and not series:
        audit.fail(f"{source} {row_label}: {field} is empty but the metric has end value {end_value:g}")
    if fail_when_end_absent and end_value is None and series:
        audit.fail(f"{source} {row_label}: {field} has points but the metric end value is null")

    parsed: list[tuple[date, float]] = []
    seen_dates: set[date] = set()
    for index, point in enumerate(series):
        point_label = f"{field}[{index}]"
        if not isinstance(point, dict):
            audit.fail(f"{source} {row_label}: {point_label} is not an object")
            continue

        point_date = parse_point_date(point.get("date"), label=f"{source} {row_label}: {point_label}.date")
        if point_date is None:
            audit.fail(f"{source} {row_label}: {point_label}.date is not an ISO YYYY-MM-DD date")
            continue

        if not is_number(point.get("value")):
            audit.fail(f"{source} {row_label}: {point_label}.value is not a finite number")
            continue
        value = float(point["value"])
        if value < 0:
            audit.fail(f"{source} {row_label}: {point_label}.value is negative")
        if not math.isclose(value, round(value), abs_tol=1e-9):
            audit.fail(f"{source} {row_label}: {point_label}.value is not an integer count")

        if point_date in seen_dates:
            audit.fail(f"{source} {row_label}: {field} has duplicate date {point_date.isoformat()}")
        seen_dates.add(point_date)

        if point_date < quarter_start or point_date > quarter_end:
            audit.fail(
                f"{source} {row_label}: {field} date {point_date.isoformat()} is outside "
                f"{quarter_start.isoformat()}..{quarter_end.isoformat()}"
            )
        if point_date.weekday() != 6:
            audit.fail(
                f"{source} {row_label}: {field} date {point_date.isoformat()} is not a Sunday bucket"
            )

        parsed.append((point_date, value))

    if len(parsed) != len(series):
        return parsed

    for (previous_date, previous_value), (current_date, current_value) in zip(parsed, parsed[1:]):
        if current_date <= previous_date:
            audit.fail(f"{source} {row_label}: {field} dates are not strictly increasing")
        gap_days = (current_date - previous_date).days
        if gap_days != 7:
            audit.fail(
                f"{source} {row_label}: {field} gap from {previous_date.isoformat()} "
                f"to {current_date.isoformat()} is {gap_days} days, expected 7"
            )
        if require_monotone and current_value < previous_value:
            audit.fail(
                f"{source} {row_label}: {field} decreases from {previous_value:g} "
                f"to {current_value:g} at {current_date.isoformat()}"
            )

    if parsed:
        _, first_value = parsed[0]
        _, last_value = parsed[-1]
        if compare_last_to_end and end_value is not None and not math.isclose(last_value, end_value, abs_tol=1e-9):
            audit.fail(
                f"{source} {row_label}: {field} final value {last_value:g} does not match "
                f"metric end value {end_value:g}"
            )
        if start_value is not None and not math.isclose(first_value, start_value, abs_tol=1e-9):
            audit.fail(
                f"{source} {row_label}: {field} first value {first_value:g} does not match "
                f"metric start value {start_value:g}"
            )

    return parsed


def validate_repositories(audit: Audit, *, source: str, row_label: str, repositories: Any) -> None:
    if not isinstance(repositories, list):
        audit.fail(f"{source} {row_label}: repositories is not an array")
        return

    for index, repo in enumerate(repositories):
        repo_label = f"repositories[{index}]"
        if not isinstance(repo, dict):
            audit.fail(f"{source} {row_label}: {repo_label} is not an object")
            continue
        for field in ("url", "name"):
            value = repo.get(field)
            if not isinstance(value, str) or not value.strip():
                audit.fail(f"{source} {row_label}: {repo_label}.{field} is not a non-empty string")
        for field in ("stars", "forks"):
            value = repo.get(field)
            if not is_number(value) or float(value) < 0 or not is_int_like(value):
                audit.fail(f"{source} {row_label}: {repo_label}.{field} is not a non-negative integer")


def validate_records(source_data: SourceData, audit: Audit) -> None:
    source = source_data.label
    rows = source_data.rows
    if not rows:
        audit.fail(f"{source}: contains no rows")
        return

    seen_owner_ids: set[str] = set()
    seen_logins: set[str] = set()
    quarter_starts: set[date] = set()
    quarter_ends: set[date] = set()

    for index, record in enumerate(rows):
        row_label = f"row {index}"
        if not isinstance(record, dict):
            audit.fail(f"{source} {row_label}: record is not an object")
            continue
        if not require_fields(
            audit,
            source=source,
            row_label=row_label,
            record=record,
            fields=FULL_REQUIRED_COLUMNS,
        ):
            continue

        try:
            quarter_start = parse_date_value(record["quarter_start"], label=f"{source} {row_label}.quarter_start")
            quarter_end = parse_date_value(record["quarter_end"], label=f"{source} {row_label}.quarter_end")
        except ValueError as exc:
            audit.fail(str(exc))
            continue
        quarter_starts.add(quarter_start)
        quarter_ends.add(quarter_end)
        if quarter_end <= quarter_start:
            audit.fail(f"{source} {row_label}: quarter_end must be after quarter_start")

        owner_id = record["owner_id"]
        owner_login = record["owner_login"]
        if not isinstance(owner_id, str) or not owner_id.strip():
            audit.fail(f"{source} {row_label}: owner_id is not a non-empty string")
        elif owner_id in seen_owner_ids:
            audit.fail(f"{source} {row_label}: duplicate owner_id {owner_id!r}")
        else:
            seen_owner_ids.add(owner_id)

        if not isinstance(owner_login, str) or not owner_login.strip():
            audit.fail(f"{source} {row_label}: owner_login is not a non-empty string")
        else:
            login_key = owner_login.lower()
            if login_key in seen_logins:
                audit.fail(f"{source} {row_label}: duplicate owner_login {owner_login!r}")
            seen_logins.add(login_key)

        owner_url = record.get("owner_url")
        if owner_url is not None and (
            not isinstance(owner_url, str) or not owner_url.startswith("https://github.com/")
        ):
            audit.fail(f"{source} {row_label}: owner_url is not a GitHub URL")

        division = record["division"]
        if division not in DIVISIONS:
            audit.fail(f"{source} {row_label}: unexpected division {division!r}")

        if not is_int_like(record["division_rank"]) or float(record["division_rank"]) < 1:
            audit.fail(f"{source} {row_label}: division_rank is not a positive integer")

        for column in COUNT_COLUMNS:
            value = record[column]
            if value is None or is_null(value):
                continue
            if not is_number(value) or float(value) < 0:
                audit.fail(f"{source} {row_label}: {column} is not a non-negative number")
            elif not is_int_like(value):
                audit.fail(f"{source} {row_label}: {column} is not an integer count")

        for metric in METRIC_PREFIXES:
            start_value = as_float(record[f"{metric}_start"])
            end_value = as_float(record[f"{metric}_end"])
            if start_value is not None and end_value is not None and end_value < start_value:
                audit.fail(
                    f"{source} {row_label}: {metric}_end {end_value:g} is smaller than "
                    f"{metric}_start {start_value:g}"
                )
            percentile = as_float(record[f"{metric}_growth_percentile"])
            if percentile is not None and not (0 <= percentile <= 100):
                audit.fail(f"{source} {row_label}: {metric}_growth_percentile is outside 0..100")
            weight = as_float(record[f"{metric}_final_weight"])
            if weight is not None and weight < 0:
                audit.fail(f"{source} {row_label}: {metric}_final_weight is negative")

        for field, metric in TIME_SERIES_TO_METRIC.items():
            validate_series(
                audit,
                source=source,
                row_label=row_label,
                field=field,
                series=record[field],
                quarter_start=quarter_start,
                quarter_end=quarter_end,
                start_value=as_float(record[f"{metric}_start"]),
                end_value=as_float(record[f"{metric}_end"]),
                require_when_end_present=True,
                fail_when_end_absent=True,
                compare_last_to_end=True,
                require_monotone=True,
            )

        package_series: dict[str, list[tuple[date, float]]] = {}
        for field in PACKAGE_SERIES_COLUMNS:
            package_series[field] = validate_series(
                audit,
                source=source,
                row_label=row_label,
                field=field,
                series=record[field],
                quarter_start=quarter_start,
                quarter_end=quarter_end,
                start_value=None,
                end_value=None,
                require_when_end_present=False,
                fail_when_end_absent=False,
                compare_last_to_end=False,
                require_monotone=False,
            )
        package_end = as_float(record["package_downloads_end"])
        package_start = as_float(record["package_downloads_start"])
        non_empty_package_series = [series for series in package_series.values() if series]
        if package_end is not None and package_end > 0 and not non_empty_package_series:
            audit.fail(f"{source} {row_label}: package_downloads_end is present but all package series are empty")
        if package_end is None and non_empty_package_series:
            audit.fail(f"{source} {row_label}: package series are present but package_downloads_end is null")
        if non_empty_package_series:
            first_total = sum(series[0][1] for series in non_empty_package_series)
            last_total = sum(series[-1][1] for series in non_empty_package_series)
            if package_start is None or not math.isclose(first_total, package_start, abs_tol=1e-9):
                audit.fail(
                    f"{source} {row_label}: package series first values sum to {first_total:g}, "
                    f"but package_downloads_start is {package_start!r}"
                )
            if package_end is None or not math.isclose(last_total, package_end, abs_tol=1e-9):
                audit.fail(
                    f"{source} {row_label}: package series final values sum to {last_total:g}, "
                    f"but package_downloads_end is {package_end!r}"
                )
        validate_repositories(audit, source=source, row_label=row_label, repositories=record["repositories"])

    if len(quarter_starts) != 1:
        audit.fail(f"{source}: expected one quarter_start value, got {sorted(d.isoformat() for d in quarter_starts)}")
    if len(quarter_ends) != 1:
        audit.fail(f"{source}: expected one quarter_end value, got {sorted(d.isoformat() for d in quarter_ends)}")


def validate_expected_quarter(
    source_data: SourceData,
    *,
    quarter_id: str | None,
    quarter_start: str | None,
    quarter_end: str | None,
    audit: Audit,
) -> None:
    if not source_data.rows:
        return
    source = source_data.label
    first = source_data.rows[0]
    if quarter_id:
        try:
            expected_start = quarter_start_from_id(quarter_id)
        except ValueError as exc:
            audit.fail(str(exc))
        else:
            actual_start = parse_date_value(first["quarter_start"], label=f"{source}.quarter_start")
            if actual_start != expected_start:
                audit.fail(
                    f"{source}: quarter_start {actual_start.isoformat()} does not match {quarter_id} "
                    f"start {expected_start.isoformat()}"
                )
    if quarter_start:
        expected = parse_date_value(quarter_start, label="--quarter-start")
        actual = parse_date_value(first["quarter_start"], label=f"{source}.quarter_start")
        if actual != expected:
            audit.fail(f"{source}: quarter_start {actual.isoformat()} does not match expected {expected.isoformat()}")
    if quarter_end:
        expected = parse_date_value(quarter_end, label="--quarter-end")
        actual = parse_date_value(first["quarter_end"], label=f"{source}.quarter_end")
        if actual != expected:
            audit.fail(f"{source}: quarter_end {actual.isoformat()} does not match expected {expected.isoformat()}")


def compare_numeric_column(
    audit: Audit,
    *,
    source: str,
    published: pd.Series,
    recomputed: pd.Series,
    column: str,
    tolerance: float = 1e-8,
) -> None:
    mismatches = 0
    first_message: str | None = None
    for index, (published_value, recomputed_value) in enumerate(zip(published, recomputed)):
        if is_null(published_value) and is_null(recomputed_value):
            continue
        if is_null(published_value) != is_null(recomputed_value):
            mismatches += 1
            first_message = (
                first_message
                or f"{source} row {index}: {column} published={published_value!r}, recomputed={recomputed_value!r}"
            )
            continue
        if abs(float(published_value) - float(recomputed_value)) > tolerance:
            mismatches += 1
            first_message = (
                first_message
                or f"{source} row {index}: {column} published={published_value!r}, recomputed={recomputed_value!r}"
            )
    if mismatches:
        audit.fail(f"{column} has {mismatches:,} recomputation mismatch(es); first: {first_message}")


def validate_full_ranking(source_data: SourceData, *, top_n: int, audit: Audit) -> None:
    if source_data.dataframe is None or source_data.dataframe.empty:
        return
    source = source_data.label
    df = source_data.dataframe.copy()
    missing = [column for column in FULL_REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        return

    for division, group in df.groupby("division", dropna=False):
        if division not in DIVISIONS:
            continue
        ranks = pd.to_numeric(group["division_rank"], errors="coerce")
        if ranks.isna().any():
            audit.fail(f"{source}: {division} has null or non-numeric division_rank values")
            continue
        if len(group) < top_n:
            audit.fail(f"{source}: {division} has only {len(group):,} rows, expected at least top{top_n}")
        top_ranks = sorted({int(round(rank)) for rank in ranks if rank <= top_n})
        expected = list(range(1, top_n + 1))
        if top_ranks != expected:
            audit.fail(f"{source}: {division} top ranks are not exactly 1..{top_n}")

        if "division_size" in group.columns:
            sizes = set(int(size) for size in group["division_size"].dropna().unique())
            if sizes != {len(group)}:
                audit.fail(f"{source}: {division} division_size values {sorted(sizes)} do not match {len(group):,}")

    duplicate_logins = df["owner_login"].astype(str).str.lower().duplicated(keep=False)
    if duplicate_logins.any():
        sample = sorted(df.loc[duplicate_logins, "owner_login"].astype(str).str.lower().unique())[:5]
        audit.fail(f"{source}: duplicate owner_login values: {sample}")

    duplicate_owner_ids = df["owner_id"].astype(str).duplicated(keep=False)
    if duplicate_owner_ids.any():
        sample = sorted(df.loc[duplicate_owner_ids, "owner_id"].astype(str).unique())[:5]
        audit.fail(f"{source}: duplicate owner_id values: {sample}")

    published = df.copy()
    recomputed = df.copy()
    for column in [
        "division",
        "division_rank",
        *[
            f"{metric}_{suffix}"
            for metric in METRIC_PREFIXES
            for suffix in ("growth_rate", "growth_percentile", "final_weight")
        ],
    ]:
        recomputed[f"_published_{column}"] = recomputed[column]

    if ci.DIVISION_SOURCE_COLUMN not in recomputed.columns:
        audit.fail(f"{source}: missing division source column {ci.DIVISION_SOURCE_COLUMN}")
        return

    recomputed = ci.preprocess_package_downloads(recomputed)
    recomputed["division"] = ci.assign_division(recomputed[ci.DIVISION_SOURCE_COLUMN])
    recomputed = ci.add_metric_growth_scores(recomputed, metrics=ci.active_metrics())
    recomputed = ci.add_metric_weights_and_score(recomputed, metrics=ci.active_metrics())
    recomputed = ci.add_ranks(recomputed)

    division_mismatch = published["division"].astype(str) != recomputed["division"].astype(str)
    if division_mismatch.any():
        first = int(division_mismatch[division_mismatch].index[0])
        audit.fail(
            f"{source}: {int(division_mismatch.sum()):,} division mismatch(es); "
            f"first row {first} published={published.loc[first, 'division']!r}, "
            f"recomputed={recomputed.loc[first, 'division']!r}"
        )

    compare_numeric_column(
        audit,
        source=source,
        published=published["division_rank"],
        recomputed=recomputed["division_rank"],
        column="division_rank",
        tolerance=1e-8,
    )
    for metric in METRIC_PREFIXES:
        for suffix in ("growth_rate", "growth_percentile", "final_weight"):
            column = f"{metric}_{suffix}"
            compare_numeric_column(
                audit,
                source=source,
                published=published[column],
                recomputed=recomputed[column],
                column=column,
                tolerance=1e-8,
            )

    not_eligible = ~recomputed["eligible_for_ranking"].fillna(False)
    if not_eligible.any():
        first = int(not_eligible[not_eligible].index[0])
        audit.fail(f"{source}: {int(not_eligible.sum()):,} row(s) are no longer eligible when recomputed; first row {first}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate OSSCAR release data artifacts and published Supabase rows."
    )
    parser.add_argument("--parquet", type=Path, help="Full ranking parquet to validate.")
    parser.add_argument(
        "--supabase",
        action="store_true",
        help="Validate organizations_full rows for --quarter-id from the configured Supabase project.",
    )
    parser.add_argument("--quarter-id", help='Quarter id, e.g. "Q2_2026". Required for --supabase.')
    parser.add_argument("--quarter-start", help="Expected quarter_start date (YYYY-MM-DD).")
    parser.add_argument("--quarter-end", help="Expected quarter_end date (YYYY-MM-DD).")
    parser.add_argument("--top-n", type=int, default=100, help="Published frontend rows per division.")
    parser.add_argument("--max-examples", type=int, default=80, help="Maximum failure examples to print.")
    args = parser.parse_args()

    if not args.parquet and not args.supabase:
        parser.error("provide at least one of --parquet or --supabase")
    if args.supabase and not args.quarter_id:
        parser.error("--quarter-id is required with --supabase")
    if args.quarter_id and not QUARTER_ID_RE.match(args.quarter_id):
        parser.error('--quarter-id must match "Q1_2026" style')
    if args.top_n < 1:
        parser.error("--top-n must be positive")
    if args.max_examples < 1:
        parser.error("--max-examples must be positive")
    return args


def main() -> None:
    args = parse_args()
    audit = Audit(max_examples=args.max_examples)

    sources: list[SourceData] = []
    if args.parquet:
        sources.append(load_parquet(args.parquet, audit))
    if args.supabase:
        sources.append(load_supabase_quarter(args.quarter_id, audit))

    for source_data in sources:
        validate_records(source_data, audit)
        validate_expected_quarter(
            source_data,
            quarter_id=args.quarter_id,
            quarter_start=args.quarter_start,
            quarter_end=args.quarter_end,
            audit=audit,
        )
        validate_full_ranking(source_data, top_n=args.top_n, audit=audit)

    audit.assert_no_failures()


if __name__ == "__main__":
    main()
