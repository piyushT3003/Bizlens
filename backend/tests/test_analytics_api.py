"""Tests for BizLens Analytics API endpoints."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint into test DB."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_api_get_metric_catalog(client: TestClient, demo_dataset):
    response = client.get("/api/v1/analytics/metrics")
    assert response.status_code == 200
    catalog = response.json()
    assert isinstance(catalog, list)
    assert len(catalog) >= 11
    ids = [m["id"] for m in catalog]
    assert "total_revenue" in ids
    assert "gross_profit" in ids
    assert "gross_margin_pct" in ids


def test_api_execute_query(client: TestClient, demo_dataset):
    payload = {
        "metric_ids": ["total_revenue", "gross_profit", "gross_margin_pct", "total_orders"],
        "compare_to_previous": True,
    }
    response = client.post("/api/v1/analytics/query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "metrics" in data
    assert "total_revenue" in data["metrics"]
    rev_metric = data["metrics"]["total_revenue"]
    assert rev_metric["is_available"] is True
    assert rev_metric["value"] is not None
    assert rev_metric["value"] > 0
    assert "₹" in rev_metric["formatted_value"]

    # Lineage check
    assert "lineage" in data
    lineage = data["lineage"]
    assert lineage is not None
    assert lineage["total_rows_scanned"] == 10000
    assert lineage["rows_after_filters"] == 10000
    assert lineage["execution_time_ms"] > 0
    assert lineage["formula_registry_version"] == "v1.0"


def test_api_execute_query_with_filters(client: TestClient, demo_dataset):
    payload = {
        "metric_ids": ["total_revenue", "total_orders"],
        "filters": {
            "categories": ["Electronics"],
        },
        "compare_to_previous": False,
    }
    response = client.post("/api/v1/analytics/query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["metrics"]["total_revenue"]["value"] > 0
    assert data["lineage"]["rows_after_filters"] < 10000
    assert "categories" in data["lineage"]["filters_applied"]


def test_api_execute_breakdown(client: TestClient, demo_dataset):
    payload = {
        "dimension_role": "category",
        "metric_ids": ["total_revenue", "total_orders"],
    }
    response = client.post("/api/v1/analytics/breakdown", json=payload)
    assert response.status_code == 200
    breakdown = response.json()
    assert isinstance(breakdown, list)
    assert len(breakdown) > 0

    first_item = breakdown[0]
    assert "dimension_value" in first_item
    assert "metrics" in first_item
    assert "total_revenue" in first_item["metrics"]
    assert "share_pct" in first_item
    assert first_item["rank"] == 1
    assert first_item["share_pct"] > 0


def test_api_guardrail_verify(client: TestClient):
    payload = {
        "text": "Total revenue reached ₹1.24 Cr with 34.5% margin in 2024.",
        "fact_values": [12400000.0, 34.5],
        "context_years": [2024],
        "tolerance": 0.01,
    }
    response = client.post("/api/v1/analytics/guardrail/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] is True
    assert len(data["violations"]) == 0
    assert data["total_extracted"] >= 2


def test_api_guardrail_catch_violations(client: TestClient):
    payload = {
        "text": "We generated an unverified 85.0% profit margin and ₹99.9 Cr revenue.",
        "fact_values": [1000.0, 10.0],
        "tolerance": 0.01,
    }
    response = client.post("/api/v1/analytics/guardrail/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] is False
    assert len(data["violations"]) >= 2


def test_api_guardrail_metrics(client: TestClient):
    response = client.get("/api/v1/analytics/guardrail/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_verifications" in data
    assert "total_violations" in data
    assert "violation_rate" in data
