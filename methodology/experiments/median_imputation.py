#!/usr/bin/env python3
"""Experiment: level the playing field by imputing missing metrics.

Problem this addresses: the live methodology composite is the sum of per-metric
scores over the metrics each org is eligible for. Orgs missing a metric
entirely (e.g. don't publish packages) get fewer score terms and are
structurally disadvantaged vs. orgs with all three metrics.

Approach:
  1. Compute padded quarterly growth rates as usual.
  2. For each division, impute ineligible growth rates with the division-level
     median of the eligible growth rates for that metric.
  3. Apply log-minmax scaling to the full (eligible + imputed) vector.
  4. Composite = sum of per-metric scores (same as v6 live).

Notes:
  - "Ineligible" here includes both truly-missing data and data that failed the
    padding / non-negative filters. Treating them the same keeps the impl
    simple and fully levels the playing field — the whole point of this
    experiment.
  - Orgs with zero eligible metrics in their division stay excluded (we need
    at least one real signal before imputing the rest).
  - The exported ``*_growth_rate`` column keeps the ORIGINAL value. The
    frontend still shows "—" for genuinely-missing metrics — imputation only
    shifts the composite score + rank.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from _common import (
    aggregate_weighted_sum,
    padding_threshold_for_metric,
    percentile_rank,
    quarter_growth,
    run_experiment,
)
from compute_index import MetricSpec, log_minmax


def _compute_growth_and_eligibility(df: pd.DataFrame, metric: MetricSpec) -> None:
    """Populate growth_rate + eligibility + padding columns for one metric (in-place)."""
    padding_col = f"{metric.key}_padding_threshold"
    padded_start_col = f"{metric.key}_start_for_growth"
    growth_col = f"{metric.key}_growth_rate"
    eligible_col = f"{metric.key}_eligible_for_scoring"

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


def score_with_median_imputation(
    df: pd.DataFrame, metrics: list[MetricSpec]
) -> pd.DataFrame:
    quarter_group_cols = [c for c in ["quarter_start"] if c in df.columns]

    # Pass 1: compute growth + eligibility for every metric.
    for metric in metrics:
        _compute_growth_and_eligibility(df, metric)

    # An org participates if at least one metric is eligible in its division.
    any_eligible = pd.concat(
        [df[f"{m.key}_eligible_for_scoring"] for m in metrics], axis=1
    ).any(axis=1)

    # Pass 2: per-metric, impute ineligibles with the division median of
    # eligible growth rates, then log-minmax across the full vector.
    for metric in metrics:
        growth_col = f"{metric.key}_growth_rate"
        eligible_col = f"{metric.key}_eligible_for_scoring"
        imputed_col = f"{metric.key}_growth_rate_imputed"
        score_stash_col = f"{metric.key}_growth_z_score"
        pct_col = f"{metric.key}_growth_percentile"
        size_pct_col = f"{metric.key}_size_percentile"
        score_col = f"{metric.key}_score_for_aggregation"

        df[imputed_col] = np.nan
        df[score_stash_col] = np.nan
        df[pct_col] = np.nan
        df[size_pct_col] = np.nan
        df[score_col] = np.nan

        group_cols = list(quarter_group_cols) + ["division"]
        participating = any_eligible & df["division"].notna()
        if participating.sum() == 0:
            continue

        for _, idx in df.loc[participating].groupby(group_cols, dropna=False).groups.items():
            idx_list = list(idx)
            sub_growth = df.loc[idx_list, growth_col]
            sub_eligible = df.loc[idx_list, eligible_col]
            sub_end = df.loc[idx_list, metric.end_col]

            eligible_growths = sub_growth.where(sub_eligible)
            if eligible_growths.notna().any():
                median_growth = eligible_growths.median()
            else:
                # No eligible orgs for this metric in the division — skip
                # imputation (everyone gets score 0 which log_minmax
                # degenerates to 0 anyway).
                median_growth = 0.0

            imputed = sub_growth.where(sub_eligible, other=median_growth)
            df.loc[idx_list, imputed_col] = imputed
            df.loc[idx_list, score_stash_col] = log_minmax(imputed)
            df.loc[idx_list, score_col] = log_minmax(imputed)

            # Percentiles: keep reporting the eligible-only view (consistent
            # with how the frontend interprets these columns).
            df.loc[idx_list, pct_col] = percentile_rank(
                sub_growth.where(sub_eligible)
            )
            df.loc[idx_list, size_pct_col] = percentile_rank(sub_end)

    return df


def main() -> None:
    run_experiment(
        name="median_imputation",
        scoring_pass_fn=score_with_median_imputation,
        aggregate_fn=aggregate_weighted_sum,
    )


if __name__ == "__main__":
    main()
