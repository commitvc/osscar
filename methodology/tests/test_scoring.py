"""Tests for the OSS Growth Index scoring pipeline.

Uses a small fixture dataset to verify that the scoring functions
produce correct, deterministic results.
"""

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

# Add methodology/ to the path so we can import compute_index
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import compute_index as ci

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
SAMPLE_INPUT = FIXTURES_DIR / "sample_input.csv"


@pytest.fixture
def sample_df() -> pd.DataFrame:
    df = pd.read_csv(SAMPLE_INPUT, low_memory=False)
    df = ci.preprocess_package_downloads(df)
    return df


@pytest.fixture
def scored_df(sample_df: pd.DataFrame) -> pd.DataFrame:
    metrics = ci.active_metrics()
    df = sample_df.copy()
    df["division"] = ci.assign_division(df[ci.DIVISION_SOURCE_COLUMN])
    df = ci.add_metric_growth_scores(df, metrics=metrics)
    df = ci.add_metric_weights_and_score(df, metrics=metrics)
    df = ci.add_ranks(df)
    return df


class TestDivisionAssignment:
    def test_below_1000_threshold(self, sample_df: pd.DataFrame):
        divisions = ci.assign_division(sample_df["github_stars_start"])
        # org-epsilon (200 stars), org-zeta (50), org-eta (100) should be below_1000
        below = sample_df[divisions == "below_1000"]["owner_login"].tolist()
        assert "org-epsilon" in below
        assert "org-zeta" in below
        assert "org-eta" in below

    def test_above_1000_threshold(self, sample_df: pd.DataFrame):
        divisions = ci.assign_division(sample_df["github_stars_start"])
        # org-alpha (5000), org-theta (15000) should be above_1000
        above = sample_df[divisions == "above_1000"]["owner_login"].tolist()
        assert "org-alpha" in above
        assert "org-theta" in above

    def test_exact_threshold(self):
        """Orgs with exactly 1000 stars go to above_1000."""
        series = pd.Series([1000.0])
        result = ci.assign_division(series)
        assert result.iloc[0] == "above_1000"


class TestPackageDownloadAggregation:
    def test_aggregates_multiple_registries(self, sample_df: pd.DataFrame):
        # org-alpha has npm=500000 and cargo=100000 -> start should be 600000
        alpha = sample_df[sample_df["owner_login"] == "org-alpha"].iloc[0]
        assert alpha["package_downloads_start"] == 600000.0

    def test_single_registry(self, sample_df: pd.DataFrame):
        # org-zeta has only npm_downloads_start=5000
        zeta = sample_df[sample_df["owner_login"] == "org-zeta"].iloc[0]
        assert zeta["package_downloads_start"] == 5000.0

    def test_no_downloads_is_nan(self, sample_df: pd.DataFrame):
        # org-beta has no package download data at all
        beta = sample_df[sample_df["owner_login"] == "org-beta"].iloc[0]
        assert pd.isna(beta["package_downloads_start"])


class TestGrowthRateComputation:
    def test_positive_growth(self):
        start = pd.Series([100.0])
        end = pd.Series([150.0])
        result = ci.quarter_growth(start, end)
        assert result.iloc[0] == pytest.approx(0.5)

    def test_zero_start_returns_nan(self):
        start = pd.Series([0.0])
        end = pd.Series([100.0])
        result = ci.quarter_growth(start, end)
        assert pd.isna(result.iloc[0])

    def test_negative_growth(self):
        start = pd.Series([200.0])
        end = pd.Series([100.0])
        result = ci.quarter_growth(start, end)
        assert result.iloc[0] == pytest.approx(-0.5)


class TestLogMinmax:
    def test_basic_scaling(self):
        values = pd.Series([0.0, 0.5, 1.0, 2.0])
        result = ci.log_minmax(values)
        # Minimum should map to 0, maximum to 100
        assert result.iloc[0] == pytest.approx(0.0)
        assert result.iloc[-1] == pytest.approx(100.0)
        # All values should be in [0, 100]
        assert (result >= 0).all()
        assert (result <= 100).all()

    def test_single_value_returns_zero(self):
        values = pd.Series([5.0, 5.0, 5.0])
        result = ci.log_minmax(values)
        assert (result == 0.0).all()

    def test_preserves_ordering(self):
        values = pd.Series([0.1, 0.5, 1.0, 5.0, 10.0])
        result = ci.log_minmax(values)
        # Scores should be monotonically increasing
        for i in range(len(result) - 1):
            assert result.iloc[i] < result.iloc[i + 1]


class TestPaddingThresholds:
    def test_below_1000_stars_padding(self):
        divisions = pd.Series(["below_1000"])
        result = ci.padding_threshold_for_metric("github_stars", divisions)
        assert result.iloc[0] == 100.0

    def test_above_1000_stars_padding(self):
        divisions = pd.Series(["above_1000"])
        result = ci.padding_threshold_for_metric("github_stars", divisions)
        assert result.iloc[0] == 1000.0

    def test_above_1000_contributors_padding(self):
        divisions = pd.Series(["above_1000"])
        result = ci.padding_threshold_for_metric("github_contributors", divisions)
        assert result.iloc[0] == 10.0


class TestEligibility:
    def test_declining_stars_not_eligible(self, scored_df: pd.DataFrame):
        """org-kappa has declining stars (4000 -> 3800), should not be eligible for stars scoring."""
        kappa = scored_df[scored_df["owner_login"] == "org-kappa"].iloc[0]
        assert not kappa["github_stars_eligible_for_scoring"]

    def test_growing_stars_eligible(self, scored_df: pd.DataFrame):
        """org-alpha has growing stars (5000 -> 7500), should be eligible."""
        alpha = scored_df[scored_df["owner_login"] == "org-alpha"].iloc[0]
        assert alpha["github_stars_eligible_for_scoring"]

    def test_no_package_data_not_eligible(self, scored_df: pd.DataFrame):
        """org-beta has no package data, should not be eligible for package scoring."""
        beta = scored_df[scored_df["owner_login"] == "org-beta"].iloc[0]
        assert not beta["package_downloads_eligible_for_scoring"]


class TestCompositeScoring:
    def test_composite_is_sum_of_eligible_scores(self, scored_df: pd.DataFrame):
        """In sum mode, composite = sum of eligible metric scores."""
        for _, row in scored_df[scored_df["eligible_for_ranking"]].iterrows():
            expected = 0.0
            for metric in ci.active_metrics():
                score = row[f"{metric.key}_score_for_aggregation"]
                if pd.notna(score):
                    expected += score
            assert row["composite_score"] == pytest.approx(expected, abs=1e-6), (
                f"Composite mismatch for {row['owner_login']}"
            )

    def test_more_metrics_can_increase_score(self, scored_df: pd.DataFrame):
        """Orgs eligible on more metrics should generally score higher (breadth-rewarding)."""
        eligible = scored_df[scored_df["eligible_for_ranking"]].copy()
        # This is a soft test -- not always true, but should hold on average
        avg_by_count = eligible.groupby("metric_count")["composite_score"].mean()
        if len(avg_by_count) > 1:
            # Average score should generally increase with metric count
            counts = sorted(avg_by_count.index)
            assert avg_by_count[counts[-1]] > avg_by_count[counts[0]]


class TestRanking:
    def test_ranks_are_assigned(self, scored_df: pd.DataFrame):
        eligible = scored_df[scored_df["eligible_for_ranking"]]
        assert eligible["division_rank"].notna().all()

    def test_rank_1_has_highest_score(self, scored_df: pd.DataFrame):
        for division in ci.DIVISION_ORDER:
            div_df = scored_df[
                (scored_df["division"] == division) & scored_df["eligible_for_ranking"]
            ]
            if div_df.empty:
                continue
            rank_1 = div_df[div_df["division_rank"] == 1.0]
            if not rank_1.empty:
                max_score = div_df["composite_score"].max()
                assert rank_1.iloc[0]["composite_score"] == pytest.approx(max_score)


class TestQuarterLabel:
    def test_infers_q1(self):
        df = pd.DataFrame({"quarter_start": ["2026-01-01"]})
        assert ci.infer_quarter_label(df) == "Q12026"

    def test_missing_column(self):
        df = pd.DataFrame({"other": [1]})
        assert ci.infer_quarter_label(df) == "unknown_quarter"


class TestEndToEnd:
    def test_run_produces_output(self, tmp_path: Path):
        """Full pipeline run on fixture data should produce two output files."""
        ci.run(input_csv=SAMPLE_INPUT, output_dir=tmp_path)

        above = list(tmp_path.glob("*above_1000*"))
        below = list(tmp_path.glob("*below_1000*"))
        assert len(above) == 1, f"Expected 1 above_1000 file, got {len(above)}"
        assert len(below) == 1, f"Expected 1 below_1000 file, got {len(below)}"

        # Both files should have data
        above_df = pd.read_csv(above[0])
        below_df = pd.read_csv(below[0])
        assert len(above_df) > 0
        assert len(below_df) > 0

    def test_output_is_sorted_by_score(self, tmp_path: Path):
        """Output files should be sorted by composite_score descending."""
        ci.run(input_csv=SAMPLE_INPUT, output_dir=tmp_path)

        for csv_file in tmp_path.glob("*.csv"):
            df = pd.read_csv(csv_file)
            scores = df["composite_score"].tolist()
            assert scores == sorted(scores, reverse=True), (
                f"{csv_file.name} is not sorted by composite_score"
            )

    def test_deterministic_output(self, tmp_path: Path):
        """Running twice should produce identical output."""
        dir1 = tmp_path / "run1"
        dir2 = tmp_path / "run2"
        ci.run(input_csv=SAMPLE_INPUT, output_dir=dir1)
        ci.run(input_csv=SAMPLE_INPUT, output_dir=dir2)

        for f1 in sorted(dir1.glob("*.csv")):
            f2 = dir2 / f1.name
            assert f2.exists(), f"Missing {f1.name} in second run"
            df1 = pd.read_csv(f1)
            df2 = pd.read_csv(f2)
            pd.testing.assert_frame_equal(df1, df2)
