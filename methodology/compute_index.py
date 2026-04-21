#!/usr/bin/env python3
"""Compute OSS Growth Index results (org-based, Q1 2026, v6).

Changes vs v5:
  - Growth score = log-clip-minmax scaled to [0, 100] instead of raw percentile.
    Steps per metric per division:
      1. log(1 + growth_rate)
      2. clip at 99th percentile of the log-transformed distribution
      3. min-max scale to [0, 100]
    This highlights outliers (unlike percentiles) while preventing a single
    extreme value from compressing everyone else toward 0 (unlike raw log).
  - Composite = sum of eligible scores (same as v5, breadth-rewarding).
"""

from __future__ import annotations

METHODOLOGY_VERSION = "v6"

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class MetricSpec:
    key: str
    start_col: str
    end_col: str
    family: str


DIVISION_ORDER = ["emerging", "scaling"]
DIVISION_STARS_THRESHOLD = 1000.0
DIVISION_SOURCE_COLUMN = "github_stars_start"
GROWTH_SCORE_TRANSFORM = "log_minmax"
INCLUDE_WEB_METRIC = False
INCLUDE_HUGGINGFACE_METRICS = False
WEIGHTING_MODE = "sum"

# npm/pypi/cargo are aggregated into package_downloads before scoring.
PACKAGE_DOWNLOAD_START_COLS = ["npm_downloads_start", "pypi_downloads_start", "cargo_downloads_start"]
PACKAGE_DOWNLOAD_END_COLS   = ["npm_downloads_end",   "pypi_downloads_end",   "cargo_downloads_end"]

ALL_METRICS: List[MetricSpec] = [
    MetricSpec("github_stars", "github_stars_start", "github_stars_end", "github"),
    MetricSpec(
        "github_contributors",
        "github_contributors_start",
        "github_contributors_end",
        "github",
    ),
    MetricSpec(
        "package_downloads",
        "package_downloads_start",
        "package_downloads_end",
        "usage",
    ),
]

PADDING_THRESHOLDS_BY_DIVISION: dict[str, dict[str, float]] = {
    "emerging": {
        "github_stars": 100.0,
        "github_contributors": 5.0,
        "package_downloads": 1000.0,
    },
    "scaling": {
        "github_stars": 1000.0,
        "github_contributors": 10.0,
        "package_downloads": 10000.0,
    },
}


def active_metrics() -> List[MetricSpec]:
    metrics = list(ALL_METRICS)
    if not INCLUDE_WEB_METRIC:
        metrics = [m for m in metrics if m.key != "web_visits"]
    if not INCLUDE_HUGGINGFACE_METRICS:
        metrics = [m for m in metrics if not m.key.startswith("huggingface_")]
    return metrics


def preprocess_package_downloads(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate npm + pypi + cargo into a single package_downloads metric.

    Uses sum(min_count=1) so that:
      - If ALL three are NaN  -> result is NaN  (no package data at all).
      - If at least one is non-null -> sum of available values, treating the
        absent ones as 0.  This avoids penalising orgs that only publish to
        one or two registries.

    If the input already provides `package_downloads_start`/`_end` (e.g. the
    released parquet), those are kept as-is.
    """
    if "package_downloads_start" not in df.columns:
        start_cols_present = [c for c in PACKAGE_DOWNLOAD_START_COLS if c in df.columns]
        df["package_downloads_start"] = (
            df[start_cols_present].sum(axis=1, min_count=1) if start_cols_present else np.nan
        )
    if "package_downloads_end" not in df.columns:
        end_cols_present = [c for c in PACKAGE_DOWNLOAD_END_COLS if c in df.columns]
        df["package_downloads_end"] = (
            df[end_cols_present].sum(axis=1, min_count=1) if end_cols_present else np.nan
        )
    return df


def percentile_rank(values: pd.Series) -> pd.Series:
    return values.rank(method="average", pct=True) * 100.0


def z_score(values: pd.Series) -> pd.Series:
    std = values.std(ddof=0)
    if pd.isna(std) or std == 0:
        return pd.Series(0.0, index=values.index)
    return (values - values.mean()) / std


def robust_scale(values: pd.Series) -> pd.Series:
    median = values.median()
    q1 = values.quantile(0.25)
    q3 = values.quantile(0.75)
    iqr = q3 - q1
    if pd.isna(iqr) or iqr == 0:
        return pd.Series(0.0, index=values.index)
    return (values - median) / iqr


def log_minmax(values: pd.Series) -> pd.Series:
    """Score growth rates via log -> min-max scale to [0, 100].

    1. log(1 + x)         -- compresses range while preserving outlier separation
    2. min-max to [0, 100] -- makes metrics comparable across different scales
    """
    log_vals = np.log1p(values)
    lo, hi = log_vals.min(), log_vals.max()
    if hi == lo:
        return pd.Series(0.0, index=values.index)
    return (log_vals - lo) / (hi - lo) * 100.0


def quarter_growth(start: pd.Series, end: pd.Series) -> pd.Series:
    growth = (end - start) / start
    return growth.where(start != 0)


def padding_threshold_for_metric(metric_key: str, divisions: pd.Series) -> pd.Series:
    by_division = {
        division: metric_thresholds.get(metric_key)
        for division, metric_thresholds in PADDING_THRESHOLDS_BY_DIVISION.items()
    }
    return divisions.map(by_division).astype(float)


def assign_division(stars_values: pd.Series) -> pd.Series:
    return pd.Series(
        np.select(
            [
                stars_values < DIVISION_STARS_THRESHOLD,
                stars_values >= DIVISION_STARS_THRESHOLD,
            ],
            DIVISION_ORDER,
            default=None,
        ),
        index=stars_values.index,
        dtype="object",
    )


def infer_quarter_label(df: pd.DataFrame) -> str:
    if "quarter_start" not in df.columns or df["quarter_start"].dropna().empty:
        return "unknown_quarter"
    ts = pd.to_datetime(df["quarter_start"].dropna().iloc[0], errors="coerce")
    if pd.isna(ts):
        return "unknown_quarter"
    quarter = ((int(ts.month) - 1) // 3) + 1
    return f"Q{quarter}_{ts.year}"


def add_metric_growth_scores(df: pd.DataFrame, metrics: List[MetricSpec]) -> pd.DataFrame:
    quarter_group_cols = [c for c in ["quarter_start"] if c in df.columns]

    for metric in metrics:
        padding_col = f"{metric.key}_padding_threshold"
        padded_start_col = f"{metric.key}_start_for_growth"
        growth_col = f"{metric.key}_growth_rate"
        eligible_col = f"{metric.key}_eligible_for_scoring"
        z_col = f"{metric.key}_growth_z_score"
        pct_col = f"{metric.key}_growth_percentile"
        size_pct_col = f"{metric.key}_size_percentile"
        score_col = f"{metric.key}_score_for_aggregation"

        df[padding_col] = padding_threshold_for_metric(metric.key, df["division"])
        df[padded_start_col] = np.nan
        start_and_threshold = df[metric.start_col].notna() & df[padding_col].notna()
        if start_and_threshold.any():
            df.loc[start_and_threshold, padded_start_col] = np.maximum(
                df.loc[start_and_threshold, metric.start_col],
                df.loc[start_and_threshold, padding_col],
            )

        df[growth_col] = quarter_growth(df[padded_start_col], df[metric.end_col])
        df[eligible_col] = (
            df[metric.start_col].notna()
            & df[metric.end_col].notna()
            & df[padding_col].notna()
            & df[padded_start_col].notna()
            & (df[metric.end_col] >= df[padding_col])
            & df[growth_col].notna()
            & (df[growth_col] >= 0)
        )
        df[z_col] = np.nan
        df[pct_col] = np.nan
        df[size_pct_col] = np.nan
        df[score_col] = np.nan

        group_cols = list(quarter_group_cols) + ["division"]
        valid_mask = df[eligible_col] & df["division"].notna()
        if valid_mask.sum() == 0:
            continue

        grouped = df.loc[valid_mask].groupby(group_cols, dropna=False)
        for _, idx in grouped.groups.items():
            idx_list = list(idx)
            values = df.loc[idx_list, growth_col]
            size_values = df.loc[idx_list, metric.end_col]
            growth_percentiles = percentile_rank(values)
            if GROWTH_SCORE_TRANSFORM == "z_score":
                growth_scores = z_score(values)
            elif GROWTH_SCORE_TRANSFORM == "robust_scaler":
                growth_scores = robust_scale(values)
            elif GROWTH_SCORE_TRANSFORM == "growth_percentile":
                growth_scores = growth_percentiles
            elif GROWTH_SCORE_TRANSFORM == "log_minmax":
                growth_scores = log_minmax(values)
            else:
                raise ValueError(f"Unknown growth score transform: {GROWTH_SCORE_TRANSFORM}")
            size_scores = percentile_rank(size_values)
            df.loc[idx_list, z_col] = growth_scores
            df.loc[idx_list, pct_col] = growth_percentiles
            df.loc[idx_list, size_pct_col] = size_scores
            df.loc[idx_list, score_col] = growth_scores

    return df


def add_metric_weights_and_score(df: pd.DataFrame, metrics: List[MetricSpec]) -> pd.DataFrame:
    magnitude_cols: List[str] = []

    for metric in metrics:
        growth_score_col = f"{metric.key}_score_for_aggregation"
        growth_weight_col = f"{metric.key}_growth_percentile"
        size_score_col = f"{metric.key}_size_percentile"
        magnitude_col = f"{metric.key}_weight_magnitude"
        final_weight_col = f"{metric.key}_final_weight"

        df[magnitude_col] = np.nan
        if WEIGHTING_MODE == "growth_x_size":
            valid = df[growth_weight_col].notna() & df[size_score_col].notna()
            df.loc[valid, magnitude_col] = (
                df.loc[valid, growth_weight_col] * df.loc[valid, size_score_col]
            )
        elif WEIGHTING_MODE == "size_only":
            valid = df[size_score_col].notna()
            df.loc[valid, magnitude_col] = df.loc[valid, size_score_col]
        elif WEIGHTING_MODE == "equal":
            valid = df[growth_score_col].notna()
            df.loc[valid, magnitude_col] = 1.0
        elif WEIGHTING_MODE == "sum":
            valid = df[growth_score_col].notna()
            df.loc[valid, magnitude_col] = 1.0
        else:
            raise ValueError(f"Unknown weighting mode: {WEIGHTING_MODE}")

        df[final_weight_col] = np.nan
        df[f"{metric.key}_is_family_winner"] = df[growth_score_col].notna()
        magnitude_cols.append(magnitude_col)

    mag_sum = df[magnitude_cols].sum(axis=1, skipna=True)
    valid_denominator = mag_sum > 0

    for metric in metrics:
        magnitude_col = f"{metric.key}_weight_magnitude"
        final_weight_col = f"{metric.key}_final_weight"
        mask = valid_denominator & df[magnitude_col].notna()
        if WEIGHTING_MODE == "sum":
            df.loc[mask, final_weight_col] = 1.0
        else:
            df.loc[mask, final_weight_col] = df.loc[mask, magnitude_col] / mag_sum[mask]

    weighted_score = pd.Series(0.0, index=df.index)
    for metric in metrics:
        growth_score_col = f"{metric.key}_score_for_aggregation"
        final_weight_col = f"{metric.key}_final_weight"
        mask = valid_denominator & df[final_weight_col].notna() & df[growth_score_col].notna()
        weighted_score.loc[mask] = (
            weighted_score.loc[mask]
            + (df.loc[mask, final_weight_col] * df.loc[mask, growth_score_col])
        )

    df["composite_score"] = np.nan
    df.loc[valid_denominator, "composite_score"] = weighted_score.loc[valid_denominator]
    df["metric_count"] = df[[f"{metric.key}_score_for_aggregation" for metric in metrics]].notna().sum(axis=1)
    df["family_count"] = df["metric_count"]
    return df


def add_ranks(df: pd.DataFrame) -> pd.DataFrame:
    df["eligible_for_ranking"] = df["division"].notna() & df["composite_score"].notna()
    df["division_rank"] = np.nan

    quarter_group_cols = [c for c in ["quarter_start"] if c in df.columns]
    group_cols = quarter_group_cols + ["division"]
    eligible = df[df["eligible_for_ranking"]].copy()
    if eligible.empty:
        return df

    grouped = eligible.groupby(group_cols, dropna=False)
    for _, idx in grouped.groups.items():
        idx_list = list(idx)
        df.loc[idx_list, "division_rank"] = (
            df.loc[idx_list, "composite_score"].rank(method="min", ascending=False)
        )
    return df


def make_output_columns(base_columns: List[str], metrics: List[MetricSpec]) -> List[str]:
    """Input columns pass through unchanged, then append frontend-consumed scoring columns.

    Columns added per metric: growth_rate, growth_percentile, final_weight.
    Plus the aggregated package_downloads_start/end (if not already in input),
    plus division and division_rank.
    """
    cols = list(base_columns)

    for metric in metrics:
        if metric.start_col not in cols:
            cols.append(metric.start_col)
        if metric.end_col not in cols:
            cols.append(metric.end_col)

    for metric in metrics:
        cols.extend(
            [
                f"{metric.key}_growth_rate",
                f"{metric.key}_growth_percentile",
                f"{metric.key}_final_weight",
            ]
        )

    cols.extend(["division", "division_rank"])

    return cols


def export_ranking_file(
    df: pd.DataFrame,
    output_path: Path,
    output_cols: List[str],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ranked = df[df["eligible_for_ranking"]].copy()
    ranked = ranked.sort_values(
        ["division", "division_rank", "owner_login"],
        ascending=[True, True, True],
    )
    ranked.loc[:, output_cols].to_parquet(output_path, index=False)


def run(input_path: Path, output_dir: Path) -> None:
    df = pd.read_parquet(input_path)
    metrics = active_metrics()

    # Aggregate npm/pypi/cargo into a single package_downloads metric.
    df = preprocess_package_downloads(df)

    base_columns = list(df.columns)
    if DIVISION_SOURCE_COLUMN not in df.columns:
        raise ValueError(f"Missing division source column: {DIVISION_SOURCE_COLUMN}")

    df["division"] = assign_division(df[DIVISION_SOURCE_COLUMN])
    df = add_metric_growth_scores(df, metrics=metrics)
    df = add_metric_weights_and_score(df, metrics=metrics)
    df = add_ranks(df)

    output_cols = make_output_columns(base_columns, metrics=metrics)
    quarter_label = infer_quarter_label(df)
    output_path = output_dir / f"osscar_ranking_{quarter_label}.parquet"
    export_ranking_file(df=df, output_path=output_path, output_cols=output_cols)


DEFAULT_INPUT_FILENAME = "osscar_input_data_Q1_2026.parquet"


def default_input_path() -> Path:
    script_dir = Path(__file__).resolve().parent
    candidates = [
        script_dir / "data" / DEFAULT_INPUT_FILENAME,
        script_dir / DEFAULT_INPUT_FILENAME,
        script_dir.parent / DEFAULT_INPUT_FILENAME,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute OSS Growth Index outputs (org-based).")
    parser.add_argument(
        "--input",
        type=Path,
        default=default_input_path(),
        help="Path to input basetable parquet.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results",
        help="Directory where the ranking parquet is written.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run(input_path=args.input, output_dir=args.output_dir)


if __name__ == "__main__":
    main()
