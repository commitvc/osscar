#!/usr/bin/env python3
"""Experiment: stars-boosted composite.

Per-metric scoring is unchanged (log-minmax). Aggregation is a weighted sum
that over-weights GitHub stars relative to contributors and package
downloads:

    composite = 1.0 * stars + 0.5 * contributors + 0.5 * package_downloads
"""

from __future__ import annotations

from _common import aggregate_weighted_sum, run_experiment
from compute_index import log_minmax

WEIGHTS = {
    "github_stars": 1.0,
    "github_contributors": 0.5,
    "package_downloads": 0.5,
}


def aggregate(df, metrics):
    return aggregate_weighted_sum(df, metrics, weights=WEIGHTS)


def main() -> None:
    run_experiment(
        name="stars_boost",
        score_fn=log_minmax,
        aggregate_fn=aggregate,
    )


if __name__ == "__main__":
    main()
