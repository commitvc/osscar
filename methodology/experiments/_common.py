"""Shared scaffolding for OSSCAr methodology experiments.

Each experiment script in this directory calls :func:`run_experiment` with a
custom ``score_fn`` (growth-rate -> per-metric score) and ``aggregate_fn``
(per-metric scores -> composite score). Everything else — padding thresholds,
division assignment, ranking, frontend JSON export — reuses the live pipeline.

Outputs:
  - methodology/experiments/results/<name>/osscar_ranking_<quarter>.parquet
  - frontend/data/experiments/<name>/osscar_{emerging,scaling}_top100_<quarter>.json
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

_METHODOLOGY_DIR = Path(__file__).resolve().parent.parent
if str(_METHODOLOGY_DIR) not in sys.path:
    sys.path.insert(0, str(_METHODOLOGY_DIR))

import extract_frontend_data  # noqa: E402
from compute_index import (  # noqa: E402
    DIVISION_SOURCE_COLUMN,
    MetricSpec,
    active_metrics,
    add_ranks,
    assign_division,
    export_ranking_file,
    infer_quarter_label,
    make_output_columns,
    padding_threshold_for_metric,
    percentile_rank,
    preprocess_package_downloads,
    quarter_growth,
)

ScoreFn = Callable[[pd.Series], pd.Series]
AggregateFn = Callable[[pd.DataFrame, list[MetricSpec]], pd.DataFrame]

DEFAULT_INPUT = _METHODOLOGY_DIR / "data" / "osscar_input_data_Q1_2026.parquet"
RESULTS_ROOT = _METHODOLOGY_DIR / "experiments" / "results"
FRONTEND_ROOT = _METHODOLOGY_DIR.parent / "frontend" / "data" / "experiments"


def add_metric_growth_scores(
    df: pd.DataFrame,
    metrics: list[MetricSpec],
    score_fn: ScoreFn,
) -> pd.DataFrame:
    """Per-division, per-metric scoring with a pluggable transform.

    Mirrors :func:`compute_index.add_metric_growth_scores` but routes the
    growth-rate -> score transform through ``score_fn`` instead of hard-coding
    the methodology version.
    """
    quarter_group_cols = [c for c in ["quarter_start"] if c in df.columns]

    for metric in metrics:
        padding_col = f"{metric.key}_padding_threshold"
        padded_start_col = f"{metric.key}_start_for_growth"
        growth_col = f"{metric.key}_growth_rate"
        eligible_col = f"{metric.key}_eligible_for_scoring"
        score_stash_col = f"{metric.key}_growth_z_score"
        pct_col = f"{metric.key}_growth_percentile"
        size_pct_col = f"{metric.key}_size_percentile"
        score_col = f"{metric.key}_score_for_aggregation"

        df[padding_col] = padding_threshold_for_metric(metric.key, df["division"])
        df[padded_start_col] = np.nan
        has_start = df[metric.start_col].notna() & df[padding_col].notna()
        if has_start.any():
            df.loc[has_start, padded_start_col] = np.maximum(
                df.loc[has_start, metric.start_col],
                df.loc[has_start, padding_col],
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
        df[score_stash_col] = np.nan
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
            growth_scores = score_fn(values)
            df.loc[idx_list, score_stash_col] = growth_scores
            df.loc[idx_list, pct_col] = percentile_rank(values)
            df.loc[idx_list, size_pct_col] = percentile_rank(size_values)
            df.loc[idx_list, score_col] = growth_scores

    return df


def aggregate_weighted_sum(
    df: pd.DataFrame,
    metrics: list[MetricSpec],
    weights: dict[str, float] | None = None,
) -> pd.DataFrame:
    """Composite = sum_i(w_i * score_i) over metrics with a valid score."""
    weights = weights or {m.key: 1.0 for m in metrics}
    score_cols = [f"{m.key}_score_for_aggregation" for m in metrics]

    for metric in metrics:
        score_col = f"{metric.key}_score_for_aggregation"
        df[f"{metric.key}_final_weight"] = np.where(
            df[score_col].notna(), weights.get(metric.key, 1.0), np.nan
        )
        df[f"{metric.key}_is_family_winner"] = df[score_col].notna()

    composite = pd.Series(0.0, index=df.index)
    any_valid = pd.Series(False, index=df.index)
    for metric in metrics:
        score_col = f"{metric.key}_score_for_aggregation"
        mask = df[score_col].notna()
        composite.loc[mask] = (
            composite.loc[mask] + weights.get(metric.key, 1.0) * df.loc[mask, score_col]
        )
        any_valid = any_valid | mask

    df["composite_score"] = np.nan
    df.loc[any_valid, "composite_score"] = composite.loc[any_valid]
    df["metric_count"] = df[score_cols].notna().sum(axis=1)
    df["family_count"] = df["metric_count"]
    return df


def aggregate_p_norm(
    df: pd.DataFrame,
    metrics: list[MetricSpec],
    p: float,
) -> pd.DataFrame:
    """Composite = (sum_i score_i^p)^(1/p).

    Only orgs with at least one eligible metric get a composite. Scores are
    clipped at 0 before exponentiation so negative growth (which shouldn't
    occur under current eligibility rules) can't produce complex results.
    """
    score_cols = [f"{m.key}_score_for_aggregation" for m in metrics]

    for metric in metrics:
        score_col = f"{metric.key}_score_for_aggregation"
        df[f"{metric.key}_final_weight"] = np.where(df[score_col].notna(), 1.0, np.nan)
        df[f"{metric.key}_is_family_winner"] = df[score_col].notna()

    sum_pow = pd.Series(0.0, index=df.index)
    any_valid = pd.Series(False, index=df.index)
    for metric in metrics:
        score_col = f"{metric.key}_score_for_aggregation"
        mask = df[score_col].notna()
        clipped = df.loc[mask, score_col].clip(lower=0.0)
        sum_pow.loc[mask] = sum_pow.loc[mask] + (clipped ** p)
        any_valid = any_valid | mask

    df["composite_score"] = np.nan
    df.loc[any_valid, "composite_score"] = sum_pow.loc[any_valid] ** (1.0 / p)
    df["metric_count"] = df[score_cols].notna().sum(axis=1)
    df["family_count"] = df["metric_count"]
    return df


ScoringPassFn = Callable[[pd.DataFrame, list[MetricSpec]], pd.DataFrame]


def run_experiment(
    name: str,
    aggregate_fn: AggregateFn,
    score_fn: ScoreFn | None = None,
    scoring_pass_fn: ScoringPassFn | None = None,
    input_path: Path | None = None,
) -> Path:
    """Run the pipeline with custom scoring + aggregation and emit outputs.

    Provide either ``score_fn`` (applied per-metric, per-division, over the
    eligible subset) or ``scoring_pass_fn`` (replaces the full scoring pass —
    use when the experiment needs to look across metrics/orgs, e.g. for
    imputation).
    """
    if scoring_pass_fn is None and score_fn is None:
        raise ValueError("run_experiment needs either score_fn or scoring_pass_fn")

    input_path = input_path or DEFAULT_INPUT

    df = pd.read_parquet(input_path)
    metrics = active_metrics()
    df = preprocess_package_downloads(df)
    base_columns = list(df.columns)

    if DIVISION_SOURCE_COLUMN not in df.columns:
        raise ValueError(f"Missing division source column: {DIVISION_SOURCE_COLUMN}")

    df["division"] = assign_division(df[DIVISION_SOURCE_COLUMN])
    if scoring_pass_fn is not None:
        df = scoring_pass_fn(df, metrics)
    else:
        assert score_fn is not None
        df = add_metric_growth_scores(df, metrics, score_fn=score_fn)
    df = aggregate_fn(df, metrics)
    df = add_ranks(df)

    output_cols = make_output_columns(base_columns, metrics=metrics)
    quarter_label = infer_quarter_label(df)

    parquet_out = RESULTS_ROOT / name / f"osscar_ranking_{quarter_label}.parquet"
    export_ranking_file(df=df, output_path=parquet_out, output_cols=output_cols)

    frontend_out = FRONTEND_ROOT / name
    written = extract_frontend_data.run(
        ranking_path=parquet_out,
        output_dir=frontend_out,
        top_n=extract_frontend_data.FRONTEND_TOP_N,
        quarter_label=quarter_label,
    )

    print(f"[{name}] ranking  -> {parquet_out}")
    for p in written:
        print(f"[{name}] frontend -> {p}")
    return parquet_out
