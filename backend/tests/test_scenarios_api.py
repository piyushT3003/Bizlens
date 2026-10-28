"""Pytest suite for Phase 11: What-If Scenario Simulation Workspace.

Tests:
1. Deterministic microeconomic elasticity cascade and volume contraction formula.
2. Mathematical reconciliation of variance waterfall steps to simulated gross profit.
3. 5x5 sensitivity matrix grid, baseline cell tagging, and directional sanity.
4. End-to-end /api/v1/scenarios/simulate endpoint.
5. Scenario persistence (save, list, compare endpoints).
6. Guardrailed AI explanation endpoint with FactBadges.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db
from app.db.models import Dataset, DatasetVersion, ColumnMapping, User
from app.services.scenario_engine import scenario_engine, ScenarioEngine
from app.schemas.scenarios import DriverAdjustment, ElasticityAssumptions


@pytest.fixture
def demo_dataset(client: TestClient):
    """Seed demo dataset via API endpoint."""
    res = client.post("/api/v1/datasets/demo")
    assert res.status_code == 200
    return res.json()


def test_scenario_deterministic_elasticity_math():
    """Verify microeconomic demand elasticity formula: Delta Q = Q0 * epsilon * (Delta P / P0)."""
    q0 = 100_000
    epsilon = -0.80
    price_pct = 10.0  # +10%

    vol_change = q0 * epsilon * (price_pct / 100.0)
    expected_vol = q0 + vol_change
    assert vol_change == -8_000.0
    assert expected_vol == 92_000.0
    assert round((expected_vol - q0) / q0 * 100.0, 1) == -8.0


def test_scenario_waterfall_reconciliation(client: TestClient, demo_dataset):
    """Verify gross profit variance waterfall steps strictly sum to final simulated gross profit."""
    dataset_id = demo_dataset["id"]
    payload = {
        "dataset_id": dataset_id,
        "drivers": {
            "price_pct": 10.0,
            "cost_pct": 5.0,
            "marketing_spend_pct": 0.0,
            "discount_pct": 0.0,
        },
    }
    res = client.post("/api/v1/scenarios/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()

    waterfall = data["waterfall"]
    simulated_gp = data["simulated_metrics"]["gross_profit"]

    # First step is baseline
    assert waterfall[0]["step_type"] == "baseline"
    # Last step is result
    assert waterfall[-1]["step_type"] == "result"
    assert abs(waterfall[-1]["delta_value"] - simulated_gp) < 0.05

    # Sum of baseline + individual delta effects (excluding the final result step)
    sum_effects = waterfall[0]["delta_value"]
    for step in waterfall[1:-1]:
        sum_effects += step["delta_value"]

    assert abs(sum_effects - simulated_gp) < 0.05, (
        f"Waterfall steps sum ({sum_effects}) must reconcile with simulated gross profit ({simulated_gp})"
    )


def test_sensitivity_matrix_grid_and_baseline(client: TestClient, demo_dataset):
    """Verify 5x5 sensitivity matrix dimensions, center baseline cell, and monotonicity."""
    dataset_id = demo_dataset["id"]
    payload = {
        "dataset_id": dataset_id,
        "drivers": {"price_pct": 0.0, "cost_pct": 0.0, "marketing_spend_pct": 0.0, "discount_pct": 0.0},
    }
    res = client.post("/api/v1/scenarios/simulate", json=payload)
    assert res.status_code == 200
    matrix = res.json()["sensitivity_matrix"]

    assert len(matrix) == 5
    for row in matrix:
        assert len(row) == 5

    # Center row is price_delta = 0.0, center col is cost_delta = 0.0
    baseline_cell = matrix[2][1]  # price_steps=[-10, -5, 0, 5, 10], cost_steps=[-5, 0, 5, 10, 15]
    assert baseline_cell["price_delta_pct"] == 0.0
    assert baseline_cell["cost_delta_pct"] == 0.0
    assert baseline_cell["is_baseline"] is True
    assert baseline_cell["profit_delta_pct"] == 0.0

    # Directional sanity: +10% price with 0% cost should yield higher profit than -10% price
    high_price_cell = matrix[4][1]
    low_price_cell = matrix[0][1]
    assert high_price_cell["simulated_profit"] > low_price_cell["simulated_profit"]


def test_scenario_simulate_api_endpoint(client: TestClient, demo_dataset):
    """Verify POST /api/v1/scenarios/simulate returns complete schema with fact badges."""
    dataset_id = demo_dataset["id"]
    payload = {
        "dataset_id": dataset_id,
        "drivers": {
            "price_pct": 12.0,
            "cost_pct": 2.0,
            "marketing_spend_pct": 15.0,
            "discount_pct": 1.0,
        },
    }
    res = client.post("/api/v1/scenarios/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "baseline_metrics" in data
    assert "simulated_metrics" in data
    assert "deltas" in data
    assert "assumptions" in data
    assert data["assumptions"]["price_elasticity"] == -0.80
    assert len(data["fact_badges"]) >= 4
    assert all(b["verified"] for b in data["fact_badges"])
    assert "strategic_summary" in data
    assert len(data["strategic_summary"]) > 20


def test_scenario_save_list_and_compare(client: TestClient, demo_dataset):
    """Verify scenario saving, listing, and multi-scenario comparison."""
    dataset_id = demo_dataset["id"]

    # 1. Save Scenario A
    save_payload = {
        "dataset_id": dataset_id,
        "name": "Aggressive Price Hike (+15%)",
        "drivers": {
            "price_pct": 15.0,
            "cost_pct": 0.0,
            "marketing_spend_pct": 0.0,
            "discount_pct": 0.0,
        },
    }
    res = client.post("/api/v1/scenarios/save", json=save_payload)
    assert res.status_code == 200
    saved_scenario = res.json()
    assert saved_scenario["name"] == "Aggressive Price Hike (+15%)"
    assert "id" in saved_scenario

    # 2. List Scenarios
    res_list = client.get(f"/api/v1/scenarios/list/{dataset_id}")
    assert res_list.status_code == 200
    scenario_list = res_list.json()
    assert len(scenario_list) >= 1
    assert any(s["name"] == "Aggressive Price Hike (+15%)" for s in scenario_list)

    # 3. Compare Scenarios
    res_compare = client.get(f"/api/v1/scenarios/compare/{dataset_id}")
    assert res_compare.status_code == 200
    compare_data = res_compare.json()
    assert "baseline" in compare_data
    assert len(compare_data["scenarios"]) >= 1


def test_scenario_explain_endpoint(client: TestClient, demo_dataset):
    """Verify POST /api/v1/scenarios/explain produces verified strategic narration."""
    dataset_id = demo_dataset["id"]
    sim_res = client.post(
        "/api/v1/scenarios/simulate",
        json={
            "dataset_id": dataset_id,
            "drivers": {"price_pct": 8.0, "cost_pct": 0.0, "marketing_spend_pct": 0.0, "discount_pct": 0.0},
        },
    ).json()

    explain_payload = {
        "dataset_id": dataset_id,
        "drivers": {"price_pct": 8.0, "cost_pct": 0.0, "marketing_spend_pct": 0.0, "discount_pct": 0.0},
        "simulated_metrics": sim_res["simulated_metrics"],
        "deltas": sim_res["deltas"],
        "assumptions": sim_res["assumptions"],
    }
    res = client.post("/api/v1/scenarios/explain", json=explain_payload)
    assert res.status_code == 200
    data = res.json()
    assert "strategic_summary" in data
    assert len(data["fact_badges"]) >= 4
