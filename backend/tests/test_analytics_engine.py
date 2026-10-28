"""Tests for BizLens Analytics Engine: DuckDB execution, filters, breakdowns, and lineage."""

import tempfile
from pathlib import Path
import duckdb
import pytest

from app.services.analytics_engine import analytics_engine, AnalyticsQueryResult


@pytest.fixture
def sample_parquet(tmp_path: Path) -> Path:
    """Create a controlled sample Parquet file for exact mathematical verification."""
    con = duckdb.connect(":memory:")
    pq_path = tmp_path / "test_data.parquet"
    
    # 5 rows with known arithmetic values:
    # Row 1: Order 101, 2024-01-10, Electronics, South, rev=1000, cost=600, qty=2
    # Row 2: Order 102, 2024-01-15, Apparel, North, rev=2000, cost=1000, qty=4
    # Row 3: Order 103, 2024-02-05, Electronics, South, rev=3000, cost=1500, qty=6
    # Row 4: Order 104, 2024-02-12, Home, West, rev=4000, cost=2000, qty=8
    # Row 5: Order 105, 2024-03-01, Electronics, East, rev=5000, cost=2500, qty=10
    # Totals: rev=15,000; cost=7,600; gross_profit=7,400; qty=30; orders=5
    con.execute(f"""
        COPY (
            SELECT 
                col0 AS order_id,
                col1::DATE AS txn_date,
                col2 AS category,
                col3 AS region,
                col4::DOUBLE AS sales,
                col5::DOUBLE AS cogs,
                col6::INTEGER AS quantity
            FROM (VALUES 
                ('ORD-1', '2024-01-10', 'Electronics', 'South', 1000.0, 600.0, 2),
                ('ORD-2', '2024-01-15', 'Apparel', 'North', 2000.0, 1000.0, 4),
                ('ORD-3', '2024-02-05', 'Electronics', 'South', 3000.0, 1500.0, 6),
                ('ORD-4', '2024-02-12', 'Home', 'West', 4000.0, 2000.0, 8),
                ('ORD-5', '2024-03-01', 'Electronics', 'East', 5000.0, 2500.0, 10)
            )
        ) TO '{pq_path.as_posix()}' (FORMAT PARQUET)
    """)
    con.close()
    return pq_path


def test_analytics_engine_basic_aggregations(sample_parquet: Path):
    role_to_col = {
        "revenue": "sales",
        "cost": "cogs",
        "quantity": "quantity",
        "id": "order_id",
        "date": "txn_date",
        "category": "category",
        "region": "region",
    }
    metric_ids = ["total_revenue", "total_cost", "gross_profit", "gross_margin_pct", "total_orders", "total_units"]

    res = analytics_engine.execute_query(
        parquet_path=sample_parquet,
        role_to_col=role_to_col,
        metric_ids=metric_ids,
        dataset_id="ds-123",
        version_number=1,
        content_hash="hash-abc",
    )

    assert res.metrics["total_revenue"].value == 15000.0
    assert res.metrics["total_cost"].value == 7600.0
    assert res.metrics["gross_profit"].value == 7400.0
    # Gross margin % = 7400 / 15000 * 100 = 49.33%
    assert round(res.metrics["gross_margin_pct"].value, 2) == 49.33
    assert res.metrics["total_orders"].value == 5.0
    assert res.metrics["total_units"].value == 30.0

    # Lineage verification
    assert res.lineage is not None
    assert res.lineage.total_rows_scanned == 5
    assert res.lineage.rows_after_filters == 5
    assert res.lineage.execution_time_ms >= 0.0
    assert res.lineage.content_hash == "hash-abc"


def test_analytics_engine_filters(sample_parquet: Path):
    role_to_col = {
        "revenue": "sales",
        "cost": "cogs",
        "quantity": "quantity",
        "id": "order_id",
        "date": "txn_date",
        "category": "category",
        "region": "region",
    }
    
    # Filter by category = Electronics (rows 1, 3, 5 -> rev = 1000 + 3000 + 5000 = 9000)
    filters = {"categories": ["Electronics"]}
    res = analytics_engine.execute_query(
        parquet_path=sample_parquet,
        role_to_col=role_to_col,
        metric_ids=["total_revenue", "total_orders"],
        filters=filters,
    )
    assert res.metrics["total_revenue"].value == 9000.0
    assert res.metrics["total_orders"].value == 3.0
    assert res.lineage.rows_after_filters == 3

    # Filter by date range (Jan 2024 only: rows 1, 2 -> rev = 3000)
    date_filter = {"date_range": {"start": "2024-01-01", "end": "2024-01-31"}}
    res_date = analytics_engine.execute_query(
        parquet_path=sample_parquet,
        role_to_col=role_to_col,
        metric_ids=["total_revenue", "total_orders"],
        filters=date_filter,
    )
    assert res_date.metrics["total_revenue"].value == 3000.0
    assert res_date.metrics["total_orders"].value == 2.0
    assert res_date.lineage.rows_after_filters == 2


def test_analytics_engine_breakdown(sample_parquet: Path):
    role_to_col = {
        "revenue": "sales",
        "cost": "cogs",
        "category": "category",
        "id": "order_id",
    }
    res = analytics_engine.execute_query(
        parquet_path=sample_parquet,
        role_to_col=role_to_col,
        metric_ids=["total_revenue"],
        group_by_role="category",
    )

    assert res.breakdown is not None
    assert len(res.breakdown) == 3

    # Electronics: rev 9000 (60% share), Rank 1
    # Home: rev 4000 (26.67% share), Rank 2
    # Apparel: rev 2000 (13.33% share), Rank 3
    top_cat = res.breakdown[0]
    assert top_cat.dimension_value == "Electronics"
    assert top_cat.metrics["total_revenue"] == 9000.0
    assert top_cat.rank == 1
    assert top_cat.share_pct == 60.0

    second_cat = res.breakdown[1]
    assert second_cat.dimension_value == "Home"
    assert second_cat.metrics["total_revenue"] == 4000.0
    assert second_cat.rank == 2


def test_unmapped_roles_return_structured_unavailable(sample_parquet: Path):
    # Only map revenue, omit cost and id
    partial_roles = {"revenue": "sales"}
    res = analytics_engine.execute_query(
        parquet_path=sample_parquet,
        role_to_col=partial_roles,
        metric_ids=["total_revenue", "gross_profit", "total_orders"],
    )

    assert res.metrics["total_revenue"].is_available is True
    assert res.metrics["total_revenue"].value == 15000.0

    assert res.metrics["gross_profit"].is_available is False
    assert res.metrics["gross_profit"].value is None
    assert "Missing required semantic roles: cost" in res.metrics["gross_profit"].unavailable_reason

    # total_orders is always computable (falls back to row count when id is absent)
    assert res.metrics["total_orders"].is_available is True
    assert res.metrics["total_orders"].value == 5.0
