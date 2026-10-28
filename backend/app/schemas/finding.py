"""BizLens Finding Schemas: Pydantic models for shared findings, evidence lineage, and strategic insights."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class FindingEvidence(BaseModel):
    metric: str
    dimension: Optional[str] = None
    segment_value: Optional[str] = None
    baseline_value: Optional[float] = None
    observed_value: Optional[float] = None
    delta_pct: Optional[float] = None
    impact_amount: float = 0.0
    impact_formatted: str = ""
    impact_type: str = "risk"  # "risk", "upside", "efficiency", "anomaly"
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0)
    sample_size: int = 0
    formula_name: Optional[str] = None
    duckdb_sql: Optional[str] = None
    execution_ms: Optional[float] = None


class FindingStatusUpdate(BaseModel):
    status: str = Field(..., description="'open', 'applied', 'completed', or 'dismissed'")
    note: Optional[str] = None


class FindingResponse(BaseModel):
    id: str
    version_id: str
    dataset_id: str
    dataset_name: str
    title: str
    kind: str  # "opportunity", "risk", "efficiency", "anomaly"
    priority: str  # "high", "medium", "low"
    evidence: Dict[str, Any]
    interpretation: str
    potential_action: str
    status: str  # "open", "applied", "completed", "dismissed"
    status_history: List[Dict[str, Any]] = []
    created_at: str
    updated_at: str


class FindingsSummaryResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    version_id: str
    version_number: int
    total_findings: int
    opportunities_count: int
    risks_count: int
    efficiencies_count: int
    anomalies_count: int
    high_priority_count: int
    open_count: int
    applied_count: int
    total_impact_at_risk: float
    total_impact_at_risk_formatted: str
    total_upside_potential: float
    total_upside_potential_formatted: str
    findings: List[FindingResponse]


class FindingExplainResponse(BaseModel):
    finding_id: str
    title: str
    kind: str
    explanation: str
    strategic_context: str
    risk_assessment: str
    action_steps: List[str]
    verified_facts: List[str]
    guardrail_result: str
    model_used: str
    latency_ms: float
