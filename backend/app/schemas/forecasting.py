"""Pydantic schemas for the Forecast Observatory workspace (Panel 3 of Master Design).

Defines structured contracts for backtest accuracy, held-out validation,
trend projections, root-cause contribution decomposition, de-trended anomalies,
and scenario flow graphs.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BacktestMetrics(BaseModel):
    accuracy_pct: float = Field(..., description="100 minus sMAPE on held-out periods")
    baseline_beat_pct: float = Field(..., description="Percentage improvement over seasonal-naive baseline")
    coverage_pct: float = Field(..., description="Percentage of actual values captured in 95% confidence bounds")
    test_periods_count: int = Field(default=3, description="Number of held-out validation periods")
    smape: float = Field(default=0.0, description="Symmetric Mean Absolute Percentage Error")
    mae_model: float = Field(default=0.0, description="Mean Absolute Error of model")
    mae_baseline: float = Field(default=0.0, description="Mean Absolute Error of seasonal naive baseline")


class BacktestRecord(BaseModel):
    period_label: str
    actual_value: float
    predicted_value: float
    error_pct: float
    within_interval: bool = True


class ForecastPoint(BaseModel):
    period_label: str
    actual_value: Optional[float] = None
    projected_value: Optional[float] = None
    lower_bound_95: Optional[float] = None
    upper_bound_95: Optional[float] = None
    is_projected: bool = False


class ContributionItem(BaseModel):
    dimension_value: str
    prior_value: float
    current_value: float
    delta_abs: float
    delta_formatted: str
    share_pct: float
    rank: int


class AnomalyItem(BaseModel):
    period_label: str
    metric_id: str
    actual_value: float
    expected_value: float
    lower_bound: float
    upper_bound: float
    deviation_score: float
    severity: str  # low, medium, high
    is_seasonal: bool = False
    explanation: str


class ScenarioFlowNode(BaseModel):
    node_id: str
    type: str  # driver, metric, outcome
    title: str
    delta_formatted: str
    elasticity: Optional[float] = None
    detail: str


class ForecastObservatoryResponse(BaseModel):
    dataset_id: str
    status: str = "available"  # available | insufficient_history
    history_periods_count: int
    min_required_periods: int = 12
    unavailable_reason: Optional[str] = None
    metrics: Optional[BacktestMetrics] = None
    held_out_table: List[BacktestRecord] = Field(default_factory=list)
    forecast_series: List[ForecastPoint] = Field(default_factory=list)
    contribution_breakdown: List[ContributionItem] = Field(default_factory=list)
    contribution_dimension: str = "category"
    scenario_flow: List[ScenarioFlowNode] = Field(default_factory=list)
    anomalies: List[AnomalyItem] = Field(default_factory=list)
    ai_insight: Optional[Dict[str, Any]] = None
    lineage: Optional[Dict[str, Any]] = None


class ObservatoryExplainRequest(BaseModel):
    dataset_id: str
    api_key: Optional[str] = None
