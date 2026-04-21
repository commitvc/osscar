#!/usr/bin/env python3
"""Experiment: stars anchor with mean-based bonus from other metrics.

Motivation: stars is the universal, reliable signal (every org has them);
contributors and package downloads are only available for some orgs and
shouldn't create a coverage bias. This variant of stars_with_bonus uses the
mean (instead of the sum) of the eligible other metrics, so a 1-other-metric
org is treated the same as a 2-other-metric org.

    composite = stars_score * (1 + mean(eligible_other_scores) / 100)

Properties:
  - Stars-anchored: orgs with no stars signal don't rank.
  - Coverage-unbiased: the bonus averages over however many other metrics an
    org has, so breadth doesn't help you.
  - Bounded: per-metric scores live in [0, 100], so the multiplier is in
    [1, 2], giving composite ∈ [0, 200]. No ad-hoc cap needed.
  - Simple: reuses the live log-minmax per-metric scoring. Only the
    aggregation changes.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from _common import run_experiment
from compute_index import MetricSpec, log_minmax

STARS_KEY = "github_stars"
BONUS_KEYS = ("github_contributors", "package_downloads")


def aggregate_stars_mean_bonus(
    df: pd.DataFrame, metrics: list[MetricSpec]
) -> pd.DataFrame:
    metric_keys = {m.key for m in metrics}
    missing = {STARS_KEY, *BONUS_KEYS} - metric_keys
    if missing:
        raise ValueError(f"stars_mean_bonus expects metrics {missing} to be active")

    stars_score = df[f"{STARS_KEY}_score_for_aggregation"]
    bonus_frame = pd.concat(
        {key: df[f"{key}_score_for_aggregation"] for key in BONUS_KEYS}, axis=1
    )
    # Mean of available other-metric scores; 0 if none are available.
    other_mean = bonus_frame.mean(axis=1, skipna=True).fillna(0.0)

    composite = stars_score * (1.0 + other_mean / 100.0)

    df[f"{STARS_KEY}_final_weight"] = np.where(stars_score.notna(), 1.0, np.nan)
    # Per-metric `final_weight` for bonus terms: report the effective
    # contribution each supplies, which depends on how many bonus metrics
    # are eligible for the row.
    bonus_count = bonus_frame.notna().sum(axis=1).replace(0, np.nan)
    for key in BONUS_KEYS:
        score = df[f"{key}_score_for_aggregation"]
        # Each eligible bonus metric contributes score/(100*count) to the
        # multiplier, which is the same as 1/count-th of the mean bonus.
        per_metric_weight = np.where(
            score.notna(), 1.0 / (100.0 * bonus_count), np.nan
        )
        df[f"{key}_final_weight"] = per_metric_weight

    for metric in metrics:
        df[f"{metric.key}_is_family_winner"] = df[
            f"{metric.key}_score_for_aggregation"
        ].notna()

    df["composite_score"] = composite
    score_cols = [f"{m.key}_score_for_aggregation" for m in metrics]
    df["metric_count"] = df[score_cols].notna().sum(axis=1)
    df["family_count"] = df["metric_count"]
    return df


def main() -> None:
    run_experiment(
        name="stars_mean_bonus",
        score_fn=log_minmax,
        aggregate_fn=aggregate_stars_mean_bonus,
    )


if __name__ == "__main__":
    main()
