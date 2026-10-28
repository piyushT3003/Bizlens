"""Tests for BizLens Ingestion Engine: CSV, Excel, Parquet, JSON, sanitization, and limits."""

import os
import uuid
import tempfile
from pathlib import Path
import pandas as pd
import duckdb
import pytest

from app.services.ingestion import (
    ingestion_engine,
    sanitize_column_name,
    deduplicate_column_names,
)
from app.core.errors import BizLensError, ValidationError


def test_sanitize_column_name():
    assert sanitize_column_name("  Order ID  ") == "order_id"
    assert sanitize_column_name("Total Sales ($)") == "total_sales"
    assert sanitize_column_name("2024 Revenue") == "col_2024_revenue"
    assert sanitize_column_name("State / Region") == "state_region"
    assert sanitize_column_name("___special___") == "special"
    assert sanitize_column_name("") == "col"


def test_deduplicate_column_names():
    raw_names = ["Sales", "sales", "SALES", "Order Date", "order date"]
    clean_names, mapping = deduplicate_column_names(raw_names)
    assert clean_names == ["sales", "sales_1", "sales_2", "order_date", "order_date_1"]
    assert mapping["SALES"] == "sales_2"


def test_ingest_csv(tmp_path):
    csv_file = tmp_path / "test_orders.csv"
    csv_file.write_text(
        "Order ID,Order Date,Sales Amount,Quantity\n"
        "ORD-001,2024-08-01,1500.50,2\n"
        "ORD-002,2024-08-02,2400.00,3\n"
        "ORD-003,2024-08-03,890.00,1\n"
    )

    dataset_id = str(uuid.uuid4())
    res = ingestion_engine.ingest_file(
        source_path=csv_file,
        dataset_id=dataset_id,
        version_number=1,
    )

    assert res.row_count == 3
    assert res.col_count == 4
    assert Path(res.parquet_path).exists()

    # Verify Parquet content via DuckDB
    con = duckdb.connect(":memory:")
    count = con.execute(f"SELECT COUNT(*) FROM read_parquet('{res.parquet_path}')").fetchone()[0]
    con.close()
    assert count == 3


def test_ingest_excel(tmp_path):
    df = pd.DataFrame({
        "Product": ["Headphones", "Monitor", "Keyboard"],
        "Revenue": [8500.0, 24000.0, 4200.0],
        "Units": [5, 2, 8],
    })
    xlsx_file = tmp_path / "products.xlsx"
    df.to_excel(xlsx_file, index=False)

    dataset_id = str(uuid.uuid4())
    res = ingestion_engine.ingest_file(
        source_path=xlsx_file,
        dataset_id=dataset_id,
        version_number=1,
    )

    assert res.row_count == 3
    assert res.col_count == 3
    assert Path(res.parquet_path).exists()


def test_ingest_json(tmp_path):
    df = pd.DataFrame([
        {"id": 1, "region": "Karnataka", "sales": 45000},
        {"id": 2, "region": "Maharashtra", "sales": 62000},
    ])
    json_file = tmp_path / "data.json"
    df.to_json(json_file, orient="records")

    dataset_id = str(uuid.uuid4())
    res = ingestion_engine.ingest_file(
        source_path=json_file,
        dataset_id=dataset_id,
        version_number=1,
    )

    assert res.row_count == 2
    assert res.col_count == 3
    assert Path(res.parquet_path).exists()


def test_empty_file_rejected(tmp_path):
    empty_file = tmp_path / "empty.csv"
    empty_file.write_text("")

    with pytest.raises(Exception):
        ingestion_engine.ingest_file(
            source_path=empty_file,
            dataset_id=str(uuid.uuid4()),
            version_number=1,
        )
