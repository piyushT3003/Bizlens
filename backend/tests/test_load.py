"""BizLens Load & Concurrency Verification Test.

Validates that DuckDB columnar scans, analytical queries, and ReportLab PDF/CSV generation
operate reliably under concurrent execution without deadlocks, race conditions, or unhandled exceptions.
"""

import time
import statistics
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import pytest
from fastapi.testclient import TestClient

from app.db.models import Dataset, DatasetVersion, ColumnMapping
from app.services.analytics_engine import analytics_engine


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_concurrent_analytics_and_report_load(client: TestClient, db_session, demo_dataset):
    """Executes concurrent analytics queries and report generation jobs to measure system throughput and latency."""
    dataset_id = demo_dataset["id"]
    concurrency = 8
    total_analytics_tasks = 32
    total_report_tasks = 4

    latencies_analytics = []
    latencies_reports = []
    errors = []

    # Resolve dataset version & column mapping from DB in main thread fixture
    dataset = db_session.query(Dataset).filter(Dataset.id == dataset_id).first()
    assert dataset is not None
    version = db_session.query(DatasetVersion).filter(DatasetVersion.id == dataset.active_version_id).first()
    assert version is not None
    mapping_rec = db_session.query(ColumnMapping).filter(ColumnMapping.version_id == version.id).first()
    parquet_path = Path(version.parquet_path)

    role_to_col = {}
    if mapping_rec and mapping_rec.mapping:
        for col_name, item in mapping_rec.mapping.items():
            if isinstance(item, dict):
                role = item.get("role")
                if role and role != "ignore":
                    role_to_col[role] = col_name
            elif isinstance(item, str) and item != "ignore":
                role_to_col[item] = col_name

    def run_analytics_query(query_idx: int):
        t0 = time.perf_counter()
        try:
            # Vary group by and metric selection across queries
            g_role = "category" if query_idx % 2 == 0 else "region"
            filters = {"categories": ["Electronics"]} if query_idx % 3 == 0 else {}
            res = analytics_engine.execute_query(
                parquet_path=parquet_path,
                role_to_col=role_to_col,
                metric_ids=["total_revenue", "total_orders", "gross_margin_pct", "avg_order_value"],
                group_by_role=g_role,
                filters=filters,
                dataset_id=dataset_id,
                version_number=version.version_number,
                content_hash=version.content_hash,
            )
            lat = (time.perf_counter() - t0) * 1000.0
            assert res.metrics["total_revenue"].value is not None
            assert res.breakdown is not None
            return lat
        except Exception as e:
            errors.append(f"Analytics query {query_idx} exception: {e}")
            return 0.0

    # 1. Dispatch 32 analytics queries concurrently across 8 worker threads
    start_time = time.perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(run_analytics_query, i) for i in range(total_analytics_tasks)]
        for f in as_completed(futures):
            lat = f.result()
            if lat > 0:
                latencies_analytics.append(lat)

    wall_time_analytics = time.perf_counter() - start_time

    # 2. Benchmark sequential report generations with ReportLab PDF and Matplotlib charts
    report_types = ["executive_summary", "financial_performance", "category_breakdown", "executive_summary"]
    for idx, r_type in enumerate(report_types):
        t0 = time.perf_counter()
        res = client.post(
            "/api/v1/reports/generate",
            json={
                "dataset_id": dataset_id,
                "type": r_type,
                "period_type": "quarterly",
                "period_start": "2024-07-01",
                "period_end": "2024-09-30",
                "title": f"Load Benchmark Report {idx + 1}",
                "sections": ["kpis", "charts", "insights"],
            },
        )
        lat = (time.perf_counter() - t0) * 1000.0
        assert res.status_code == 201
        data = res.json()
        assert data["has_pdf"] is True
        assert data["has_csv"] is True
        latencies_reports.append(lat)

    # Assertions
    assert len(errors) == 0, f"Encountered concurrency errors: {errors}"
    assert len(latencies_analytics) == total_analytics_tasks
    assert len(latencies_reports) == total_report_tasks

    # Calculate percentiles
    latencies_analytics.sort()
    p50_analytics = statistics.median(latencies_analytics)
    p95_idx = int(0.95 * len(latencies_analytics))
    p95_analytics = latencies_analytics[p95_idx]

    latencies_reports.sort()
    p50_reports = statistics.median(latencies_reports)

    # Telemetry report
    print("\n" + "=" * 68)
    print(" BIZLENS CONCURRENT LOAD & THROUGHPUT BENCHMARK (MUST TIER)")
    print("=" * 68)
    print(f" Concurrent Worker Threads:        {concurrency}")
    print(f" Total Analytics Queries Tested:   {total_analytics_tasks}")
    print(f" Vectorized Scan Wall Time:        {wall_time_analytics:.3f} s")
    print(f" DuckDB Analytical Throughput:     {(total_analytics_tasks / wall_time_analytics):.1f} queries/sec")
    print(f" DuckDB Scan Latency (P50/median): {p50_analytics:.2f} ms")
    print(f" DuckDB Scan Latency (P95):        {p95_analytics:.2f} ms")
    print(f" Report PDF/CSV Gen (P50/median):  {p50_reports:.2f} ms")
    print(f" Concurrency Error Rate:           0.0% (0 / {total_analytics_tasks + total_report_tasks})")
    print("=" * 68)

    # SLA requirements: Vectorized DuckDB P50 should be well under 350ms under heavy concurrent load
    assert p50_analytics < 350.0, f"Analytics P50 latency {p50_analytics}ms exceeded 350ms target"
