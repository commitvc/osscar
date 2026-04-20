#!/usr/bin/env python3
"""Experiment: v6 without the min-max step.

Keeps everything from the live methodology except the final [0, 100] rescale
on per-metric scores. Per-metric score is just ``log(1 + growth_rate)``; the
composite remains a plain sum.

The effect: metrics no longer share a common range, so a metric with a
smaller log-growth distribution contributes proportionally less to the
composite — orgs shine more when their dominant metric has heavier right tail
in absolute log-space.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from _common import aggregate_weighted_sum, run_experiment


def log_only(values: pd.Series) -> pd.Series:
    return np.log1p(values)


def main() -> None:
    run_experiment(
        name="no_minmax",
        score_fn=log_only,
        aggregate_fn=aggregate_weighted_sum,
    )


if __name__ == "__main__":
    main()
