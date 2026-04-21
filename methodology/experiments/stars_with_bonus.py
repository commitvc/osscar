#!/usr/bin/env python3
"""Experiment: stars-anchored composite with contrib + downloads as bonuses.

Per-metric scoring is unchanged from v6 (log(1+growth) min-max scaled to
[0, 100]). The composite anchors on the stars score and treats the other
two metrics as multiplicative bonuses:

    composite = stars * (1 + contrib/100 + downloads/100)

Design notes:
  - An org with no eligible stars score gets no composite — they don't rank.
  - Missing contrib or downloads simply omit that bonus term (treated as 0
    contribution to the bonus multiplier), rather than penalising the org.
  - Because per-metric scores live in [0, 100], each bonus caps at +1.0, so
    the maximum multiplier is 3.0 and stars stays the dominant signal.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from _common import run_experiment
from compute_index import MetricSpec, log_minmax

STARS_KEY = "github_stars"
BONUS_KEYS = ("github_contributors", "package_downloads")


def aggregate_stars_bonus(df: pd.DataFrame, metrics: list[MetricSpec]) -> pd.DataFrame:
    metric_keys = {m.key for m in metrics}
    missing = {STARS_KEY, *BONUS_KEYS} - metric_keys
    if missing:
        raise ValueError(f"stars_with_bonus expects metrics {missing} to be active")

    stars_score = df[f"{STARS_KEY}_score_for_aggregation"]
    bonus = pd.Series(0.0, index=df.index)
    for key in BONUS_KEYS:
        term = df[f"{key}_score_for_aggregation"] / 100.0
        bonus = bonus + term.fillna(0.0)

    composite = stars_score * (1.0 + bonus)

    # Per-metric `final_weight` columns: report the effective contribution
    # relative to the composite — useful for stakeholders eyeballing the
    # parquet. Stars carries 1.0 (anchor); bonuses carry their scaled
    # contribution where the score exists.
    df[f"{STARS_KEY}_final_weight"] = np.where(stars_score.notna(), 1.0, np.nan)
    for key in BONUS_KEYS:
        score = df[f"{key}_score_for_aggregation"]
        df[f"{key}_final_weight"] = np.where(score.notna(), 1.0 / 100.0, np.nan)

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
        name="stars_with_bonus",
        score_fn=log_minmax,
        aggregate_fn=aggregate_stars_bonus,
    )


if __name__ == "__main__":
    main()
