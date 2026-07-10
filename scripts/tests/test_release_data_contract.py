from copy import deepcopy
from datetime import date, timedelta
from typing import Any

import pandas as pd
import pytest

from scripts.ingest_quarter import parse_json_array
from scripts.validate_release_data import Audit, SourceData, validate_records


def weekly_points(values: list[int]) -> list[dict[str, int | str]]:
    first_bucket = date(2026, 4, 5)
    return [
        {
            "date": (first_bucket + timedelta(days=7 * index)).isoformat(),
            "value": value,
        }
        for index, value in enumerate(values)
    ]


def valid_record() -> dict[str, Any]:
    stars = list(range(100, 113))
    contributors = list(range(20, 33))
    package_downloads = [40, 35, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85, 100]
    return {
        "quarter_start": "2026-04-01",
        "quarter_end": "2026-06-30",
        "owner_id": "owner-1",
        "owner_login": "example",
        "owner_name": "Example",
        "owner_url": "https://github.com/example",
        "owner_logo": None,
        "homepage_url": None,
        "owner_description": None,
        "division": "emerging",
        "division_rank": 1,
        "github_stars_start": stars[0],
        "github_stars_end": stars[-1],
        "github_stars_growth_rate": 0.12,
        "github_stars_growth_percentile": 50.0,
        "github_stars_final_weight": 0.5,
        "github_contributors_start": contributors[0],
        "github_contributors_end": contributors[-1],
        "github_contributors_growth_rate": 0.6,
        "github_contributors_growth_percentile": 50.0,
        "github_contributors_final_weight": 0.5,
        "package_downloads_start": package_downloads[0],
        "package_downloads_end": package_downloads[-1],
        "package_downloads_growth_rate": 1.5,
        "package_downloads_growth_percentile": 50.0,
        "package_downloads_final_weight": 0.5,
        "github_stars_weekly": weekly_points(stars),
        "github_contributors_weekly": weekly_points(contributors),
        "npm_weekly": weekly_points(package_downloads),
        "pypi_weekly": [],
        "cargo_weekly": [],
        "repositories": [
            {
                "url": "https://github.com/example/project",
                "name": "project",
                "stars": 100,
                "forks": 10,
            }
        ],
    }


def audit_record(record: dict[str, Any]) -> Audit:
    audit = Audit(max_examples=20)
    validate_records(SourceData(label="fixture", rows=[record]), audit)
    return audit


def test_valid_release_record_accepts_fluctuating_package_downloads() -> None:
    audit = audit_record(valid_record())

    assert audit.failures == 0


def test_cumulative_github_series_cannot_decrease() -> None:
    record = deepcopy(valid_record())
    record["github_stars_weekly"][6]["value"] = 90

    audit = audit_record(record)

    assert any("github_stars_weekly decreases" in example for example in audit.examples)


def test_package_series_rejects_weekly_gaps() -> None:
    record = deepcopy(valid_record())
    del record["npm_weekly"][6]

    audit = audit_record(record)

    assert any("npm_weekly gap" in example for example in audit.examples)


def test_metric_start_must_match_first_weekly_bucket() -> None:
    record = deepcopy(valid_record())
    record["github_contributors_start"] = 1

    audit = audit_record(record)

    assert any(
        "github_contributors_weekly first value 20 does not match metric start value 1"
        in example
        for example in audit.examples
    )


def test_package_boundaries_must_match_weekly_buckets() -> None:
    record = deepcopy(valid_record())
    record["package_downloads_start"] = 1

    audit = audit_record(record)

    assert any(
        "package series first values sum to 40" in example
        for example in audit.examples
    )


def test_weekly_points_must_use_sunday_bucket_dates() -> None:
    record = deepcopy(valid_record())
    record["github_stars_weekly"][0]["date"] = "2026-04-06"

    audit = audit_record(record)

    assert any("is not a Sunday bucket" in example for example in audit.examples)


def test_ingestion_parses_only_arrays_or_scalar_nulls() -> None:
    assert parse_json_array(pd.NA, column="npm_weekly", row_label="row 0") == []
    assert parse_json_array([{"value": 1}], column="npm_weekly", row_label="row 0") == [
        {"value": 1}
    ]

    with pytest.raises(ValueError, match="expected npm_weekly to be a JSON array string"):
        parse_json_array({"value": 1}, column="npm_weekly", row_label="row 0")
