"""What-If Scenario Simulation API endpoints.

Provides routes for simulating multi-driver microeconomic models, inspecting transparent
elasticity assumptions, saving scenario runs, and generating guarded executive explanations.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.datasets import get_current_user
from app.db.models import User
from app.services.scenario_engine import scenario_engine
from app.schemas.scenarios import (
    DriverAdjustment,
    ElasticityAssumptions,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
    ScenarioSaveRequest,
    ScenarioRecordResponse,
    ScenarioCompareResponse,
    ScenarioExplainRequest,
)

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.post("/simulate", response_model=ScenarioSimulationResponse)
def simulate_scenario(
    req: ScenarioSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simulates multi-driver scenario outcome with deterministic elasticity cascade and waterfall breakdown."""
    return scenario_engine.simulate(
        db=db,
        request_dataset_id=req.dataset_id,
        drivers=req.drivers,
        custom_assumptions=req.custom_assumptions,
    )


@router.get("/assumptions/{dataset_id}", response_model=ElasticityAssumptions)
def get_assumptions(
    dataset_id: str = Path(..., description="Target dataset ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns transparent baseline elasticity assumptions for the dataset."""
    _, _, assumptions = scenario_engine.get_baseline_facts(db, dataset_id)
    return assumptions


@router.post("/save", response_model=ScenarioRecordResponse)
def save_scenario(
    req: ScenarioSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Saves a named scenario run to the database."""
    return scenario_engine.save_scenario(
        db=db,
        dataset_id=req.dataset_id,
        name=req.name,
        drivers=req.drivers,
        custom_assumptions=req.custom_assumptions,
    )


@router.get("/list/{dataset_id}", response_model=List[ScenarioRecordResponse])
def list_scenarios(
    dataset_id: str = Path(..., description="Target dataset ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all saved scenarios for the active dataset."""
    return scenario_engine.list_scenarios(db, dataset_id)


@router.get("/compare/{dataset_id}", response_model=ScenarioCompareResponse)
def compare_scenarios(
    dataset_id: str = Path(..., description="Target dataset ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves baseline alongside saved scenarios for side-by-side comparison."""
    return scenario_engine.compare_scenarios(db, dataset_id)


@router.post("/explain")
def explain_scenario(
    req: ScenarioExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Generates a guarded executive trade-off narrative for a simulated scenario."""
    _, base, _ = scenario_engine.get_baseline_facts(db, req.dataset_id)
    facts = {
        "dataset_id": req.dataset_id,
        "price_pct": req.drivers.price_pct,
        "cost_pct": req.drivers.cost_pct,
        "marketing_spend_pct": req.drivers.marketing_spend_pct,
        "discount_pct": req.drivers.discount_pct,
        "base_revenue": base["revenue"],
        "sim_revenue": req.simulated_metrics.revenue,
        "base_profit": base["gross_profit"],
        "sim_profit": req.simulated_metrics.gross_profit,
        "profit_delta_pct": req.deltas.get("profit_delta_pct", 0.0),
        "base_volume": base["volume_units"],
        "sim_volume": req.simulated_metrics.volume_units,
        "volume_delta_pct": req.deltas.get("volume_delta_pct", 0.0),
        "margin_delta_pts": req.deltas.get("margin_delta_pts", 0.0),
        "price_elasticity": req.assumptions.price_elasticity,
    }

    summary = scenario_engine._generate_strategic_summary(
        db=db,
        facts=facts,
        metrics=req.simulated_metrics,
        deltas=req.deltas,
        assumptions=req.assumptions,
    )

    return {
        "strategic_summary": summary,
        "fact_badges": [
            {"label": "Simulated Revenue", "value": req.simulated_metrics.revenue_formatted, "verified": True},
            {"label": "Profit Delta", "value": f"{req.deltas.get('profit_delta_pct', 0.0):+.1f}%", "verified": True},
            {"label": "Volume Impact", "value": f"{req.deltas.get('volume_delta_pct', 0.0):+.1f}%", "verified": True},
            {"label": "Margin Shift", "value": f"{req.deltas.get('margin_delta_pts', 0.0):+.2f} pts", "verified": True},
            {"label": "Demand Elasticity", "value": f"ε = {req.assumptions.price_elasticity:.2f}", "verified": True},
        ],
    }
