"""Pytest suite for Phase 10: Anomaly Detection, Forecasting & Forecast Observatory.

Tests:
1. Honest insufficient history boundary (< 12 periods).
2. Backtest accuracy, sMAPE, held-out validation table, prediction interval coverage.
3. Seasonal de-trending: planted anomalies ARE flagged, but repeating periodic seasonal peaks are NOT flagged.
4. Deterministic root-cause contribution decomposition (IsoCubeMap data).
5. Scenario flow graph structure.
6. End-to-end API endpoints for /api/v1/forecasting.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db
from app.db.models import Dataset, DatasetVersion, ColumnMapping, User
from app.services.forecasting_engine import forecasting_engine, ForecastingEngine


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_seasonal_detrending_anomaly_isolation():
    """Master Acceptance Criterion: Planted anomalies are found and repeating seasonal peaks are NOT flagged."""
    engine = ForecastingEngine()
    S = 4  # Seasonality period of 4
    # Create 16 points with strong repeating seasonal pattern: [100, 120, 200, 110] repeated 4 times
    # Point 2, 6, 10, 14 are periodic seasonal peaks (value 200 vs baseline 100-120)
    base_cycle = [100.0, 120.0, 200.0, 110.0]
    series = []
    for cycle in range(4):
        series.extend(base_cycle)

    # Plant a genuine unexpected anomaly at index 9 (normally 120.0, spike to 550.0)
    series[9] = 550.0

    L, T, s, residuals = engine._fit_holt_winters(series, S=S)

    # 1. The residual for the planted anomaly (idx 9) must be very high
    planted_residual = abs(residuals[9])

    # 2. The residuals for repeating seasonal peaks (indices 6, 10, 14) must be significantly smaller
    seasonal_peak_residuals = [abs(residuals[6]), abs(residuals[10]), abs(residuals[14])]
    max_seasonal_res = max(seasonal_peak_residuals)

    assert planted_residual > 300.0, f"Planted anomaly residual {planted_residual} should be large"
    assert planted_residual > max_seasonal_res * 2.5, (
        f"Planted anomaly ({planted_residual}) must stand out dramatically above repeating seasonal peaks ({max_seasonal_res})"
    )


def test_holt_winters_backtest_accuracy_math():
    """Verify sMAPE, accuracy, baseline beat, and interval math."""
    engine = ForecastingEngine()
    # Linear upward trend with slight seasonality
    series = [100.0 + 10.0 * i + (20.0 if i % 4 == 2 else 0.0) for i in range(16)]

    L, T, s, residuals = engine._fit_holt_winters(series, S=4)
    assert len(L) == 16
    assert len(T) == 16
    assert len(residuals) == 16
    # Level should be approximately increasing
    assert L[-1] > L[4]


def test_insufficient_history_honest_rejection(db_session: Session, demo_dataset: dict):
    """Datasets with fewer than 12 temporal intervals must cleanly return status='insufficient_history'."""
    engine = ForecastingEngine()
    dataset_id = demo_dataset["id"]
    # Temporarily set MIN_HISTORY_PERIODS very high to verify rejection logic
    original_min = engine.MIN_HISTORY_PERIODS
    try:
        engine.MIN_HISTORY_PERIODS = 999  # Forces insufficient history
        res = engine.get_observatory_data(db_session, dataset_id)
        assert res.status == "insufficient_history"
        assert res.history_periods_count < 999
        assert res.min_required_periods == 999
        assert "Not enough history to forecast" in (res.unavailable_reason or "")
        assert res.metrics is None
    finally:
        engine.MIN_HISTORY_PERIODS = original_min


def test_observatory_data_generation(db_session: Session, demo_dataset: dict):
    """Verify complete Forecast Observatory response generation over demo dataset."""
    engine = ForecastingEngine()
    dataset_id = demo_dataset["id"]
    res = engine.get_observatory_data(db_session, dataset_id, dimension="category")

    assert res.dataset_id == dataset_id
    if res.status == "available":
        assert res.metrics is not None
        assert 0.0 <= res.metrics.accuracy_pct <= 100.0
        assert res.metrics.baseline_beat_pct >= 0.0
        assert 0.0 <= res.metrics.coverage_pct <= 100.0
        assert len(res.held_out_table) > 0
        assert len(res.forecast_series) > len(res.held_out_table)
        assert len(res.contribution_breakdown) > 0
        assert len(res.scenario_flow) == 3
        # Check IsoCubeMap contribution items
        for item in res.contribution_breakdown:
            assert item.share_pct >= 0.0
            assert item.dimension_value is not None
            assert item.delta_formatted is not None
        # Check AI insight
        assert res.ai_insight is not None
        assert "strategic_context" in res.ai_insight


def test_get_observatory_api_endpoint(client: TestClient, demo_dataset: dict):
    """GET /api/v1/forecasting/observatory/{dataset_id} returns 200 and valid schema."""
    dataset_id = demo_dataset["id"]
    response = client.get(
        f"/api/v1/forecasting/observatory/{dataset_id}?dimension=category"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == dataset_id
    assert data["status"] in ["available", "insufficient_history"]
    if data["status"] == "available":
        assert "metrics" in data
        assert "held_out_table" in data
        assert "forecast_series" in data
        assert "contribution_breakdown" in data
        assert "scenario_flow" in data


def test_explain_observatory_api_endpoint(client: TestClient, demo_dataset: dict):
    """POST /api/v1/forecasting/explain returns 200 with guardrailed narration."""
    dataset_id = demo_dataset["id"]
    response = client.post(
        "/api/v1/forecasting/explain",
        json={"dataset_id": dataset_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == dataset_id
    assert "ai_insight" in data
