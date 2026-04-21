#!/usr/bin/env python3
"""Experiment: stars_boost without the min-max step.

Combines two ideas already tested:
  - stars_boost: weighted sum (1.0 stars + 0.5 contrib + 0.5 packages)
  - no_minmax: keep log compression but drop the [0, 100] rescale

Per-metric score = log(1 + growth_rate). Composite is a stars-weighted sum
of those raw log-scores.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from _common import aggregate_weighted_sum, run_experiment

WEIGHTS = {
    "github_stars": 1.0,
    "github_contributors": 0.5,
    "package_downloads": 0.5,
}


def log_only(values: pd.Series) -> pd.Series:
    return np.log1p(values)


def aggregate(df, metrics):
    return aggregate_weighted_sum(df, metrics, weights=WEIGHTS)


def main() -> None:
    run_experiment(
        name="stars_boost_no_minmax",
        score_fn=log_only,
        aggregate_fn=aggregate,
    )


if __name__ == "__main__":
    main()
