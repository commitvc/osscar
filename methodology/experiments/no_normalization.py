#!/usr/bin/env python3
"""Experiment: composite = sum of raw per-metric growth rates.

Drops the log / min-max transform entirely. Each metric contributes its raw
(padded) growth rate to the composite. Extreme outliers dominate under this
scheme — the point of the experiment is to see how much.
"""

from __future__ import annotations

from _common import aggregate_weighted_sum, run_experiment


def raw_growth(values):
    return values


def main() -> None:
    run_experiment(
        name="no_normalization",
        score_fn=raw_growth,
        aggregate_fn=aggregate_weighted_sum,
    )


if __name__ == "__main__":
    main()
