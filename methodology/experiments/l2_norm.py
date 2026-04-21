#!/usr/bin/env python3
"""Experiment: composite = L^2 norm over log-minmax per-metric scores.

Per-metric scoring is unchanged from v6 (log(1+growth) min-max scaled to
[0, 100]); only the aggregation switches from sum to the 2-norm:
    score = (sum_i score_i^2)^(1/2)
"""

from __future__ import annotations

from _common import aggregate_p_norm, run_experiment
from compute_index import log_minmax


def aggregate(df, metrics):
    return aggregate_p_norm(df, metrics, p=2)


def main() -> None:
    run_experiment(
        name="l2_norm",
        score_fn=log_minmax,
        aggregate_fn=aggregate,
    )


if __name__ == "__main__":
    main()
