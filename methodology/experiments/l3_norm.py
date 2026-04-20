#!/usr/bin/env python3
"""Experiment: composite = L^3 norm over log-minmax per-metric scores.

Per-metric scoring is unchanged from v6; aggregation uses the 3-norm:
    score = (sum_i score_i^3)^(1/3)
"""

from __future__ import annotations

from _common import aggregate_p_norm, run_experiment
from compute_index import log_minmax


def aggregate(df, metrics):
    return aggregate_p_norm(df, metrics, p=3)


def main() -> None:
    run_experiment(
        name="l3_norm",
        score_fn=log_minmax,
        aggregate_fn=aggregate,
    )


if __name__ == "__main__":
    main()
