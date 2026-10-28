"""Pydantic schemas for the What-If Scenario Simulation Workspace (Panel 8 of Master Design).

Defines structured contracts for scenario drivers, visible elasticity assumptions,
financial waterfall decompositions, price/cost sensitivity matrices, and side-by-side
scenario comparisons.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DriverAdjustment(BaseModel):
    price_pct: float = Field(default=0.0, description="Price change percentage (-20% to +30%)")
    cost_pct: float = Field(default=0.0, description="COGS / direct cost inflation percentage (-15% to +25%)")
    marketing_spend_pct: float = Field(default=0.0, description="Marketing spend delta percentage (-30% to +50%)")
    discount_pct: float = Field(default=0.0, description="Promotional discount rate change percentage (-10% to +15%)")


class ElasticityAssumptions(BaseModel):
    price_elasticity: float = Field(default=-0.80, description="Price elasticity of demand (epsilon)")
    marketing_elasticity: float = Field(default=0.25, description="Marketing spend volume elasticity")
    variable_cost_ratio: float = Field(default=0.65, description="Fraction of COGS varying directly with volume")
    fixed_cost_ratio: float = Field(default=0.35, description="Fraction of operating cost invariant to volume")
    source: str = Field(default="Calibrated from historical transactions", description="Data source attribution")
    methodology_note: str = Field(
        default="Volume delta computed via Delta Q = Q0 * epsilon * (Delta P / P0). Fixed operating costs invariant.",
        description="Transparent mathematical methodology note",
    )


class ScenarioMetrics(BaseModel):
    revenue: float
    revenue_formatted: str
    volume_units: int
    volume_formatted: str
    cogs: float
    cogs_formatted: str
    gross_profit: float
    gross_profit_formatted: str
    gross_margin_pct: float
    avg_unit_price: float
    avg_unit_cost: float


class WaterfallStep(BaseModel):
    label: str
    delta_value: float
    delta_formatted: str
    running_total: float
    running_formatted: str
    step_type: str  # baseline, positive, negative, subtotal, result


class SensitivityCell(BaseModel):
    price_delta_pct: float
    cost_delta_pct: float
    simulated_profit: float
    profit_formatted: str
    profit_delta_pct: float
    is_baseline: bool = False


class ScenarioSimulationRequest(BaseModel):
    dataset_id: str
    drivers: DriverAdjustment
    custom_assumptions: Optional[ElasticityAssumptions] = None


class ScenarioSimulationResponse(BaseModel):
    dataset_id: str
    baseline_metrics: ScenarioMetrics
    simulated_metrics: ScenarioMetrics
    deltas: Dict[str, Any]
    assumptions: ElasticityAssumptions
    waterfall: List[WaterfallStep]
    sensitivity_matrix: List[List[SensitivityCell]]
    strategic_summary: str
    fact_badges: List[Dict[str, Any]]
    lineage_ref: Dict[str, Any]
    execution_time_ms: float


class ScenarioSaveRequest(BaseModel):
    dataset_id: str
    name: str
    drivers: DriverAdjustment
    custom_assumptions: Optional[ElasticityAssumptions] = None


class ScenarioRecordResponse(BaseModel):
    id: str
    dataset_id: str
    version_id: str
    name: str
    created_at: str
    drivers: Dict[str, Any]
    assumptions: Dict[str, Any]
    metrics: ScenarioMetrics
    deltas: Dict[str, Any]


class ScenarioCompareResponse(BaseModel):
    dataset_id: str
    baseline: ScenarioMetrics
    scenarios: List[ScenarioRecordResponse]


class ScenarioExplainRequest(BaseModel):
    dataset_id: str
    drivers: DriverAdjustment
    simulated_metrics: ScenarioMetrics
    deltas: Dict[str, Any]
    assumptions: ElasticityAssumptions
