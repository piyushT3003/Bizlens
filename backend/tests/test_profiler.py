"""Tests for BizLens Data Profiler: Statistical summaries, anomaly detection, and data quality scoring."""

import uuid
from pathlib import Path
import pandas as pd
import pytest

from app.services.ingestion import ingestion_engine
from app.services.profiler import data_profiler


def test_profiler_statistics_and_quality_score(tmp_path):
    # Create dataset with intentional nulls, unique ID, and negative values
    df = pd.DataFrame({
        "order_id": [f"ID-{i}" for i in range(1, 101)],
        "revenue": [100.0 * i for i in range(1, 100)] + [-50.0],  # 1 negative value
        "quantity": [i % 5 for i in range(1, 101)],
        "category": ["Electronics"] * 50 + ["Apparel"] * 50,
        "notes": ["Sample note"] * 80 + [None] * 20,  # 20% nulls
    })
    csv_path = tmp_path / "profiler_test.csv"
    df.to_csv(csv_path, index=False)

    dataset_id = str(uuid.uuid4())
    ingest_res = ingestion_engine.ingest_file(csv_path, dataset_id, 1)

    profile_res = data_profiler.profile_parquet(
        parquet_path=Path(ingest_res.parquet_path),
        dataset_id=dataset_id,
        version_number=1,
    )

    assert profile_res.row_count == 100
    assert profile_res.col_count == 5

    # Check order_id uniqueness
    id_col = profile_res.columns["order_id"]
    assert id_col.is_unique is True
    assert id_col.null_count == 0

    # Check revenue stats
    rev_col = profile_res.columns["revenue"]
    assert rev_col.numeric_stats is not None
    assert rev_col.numeric_stats["negative_count"] == 1
    assert rev_col.numeric_stats["min"] == -50.0

    # Check notes null percentage
    notes_col = profile_res.columns["notes"]
    assert notes_col.null_count == 20
    assert notes_col.null_percentage == 20.0

    # Check quality score calculation
    qs = profile_res.quality_score
    assert 0.0 <= qs.score <= 100.0
    assert qs.completeness >= 90.0  # only 20 nulls out of 500 total cells
    assert qs.formula_version in ("v1.0", "v1.2-audited")
