"""BizLens Analytics & Guardrails Pydantic Schemas."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class MetricQueryRequest(BaseModel):
    dataset_id: Optional[str] = None
    metric_ids: List[str] = Field(
        default_factory=lambda: [
            "total_revenue",
            "gross_profit",
            "gross_margin_pct",
            "total_orders",
        ]
    )
    filters: Optional[Dict[str, Any]] = None
    group_by_role: Optional[str] = None
    compare_to_previous: bool = True


class BreakdownQueryRequest(BaseModel):
    dataset_id: Optional[str] = None
    dimension_role: Optional[str] = "category"
    dimension_column: Optional[str] = None
    metric_ids: List[str] = Field(default_factory=lambda: ["total_revenue"])
    filters: Optional[Dict[str, Any]] = None


class MetricResultSchema(BaseModel):
    metric_id: str
    label: str
    value: Optional[float] = None
    formatted_value: str
    unit: str
    direction: str
    previous_value: Optional[float] = None
    delta_abs: Optional[float] = None
    delta_pct: Optional[float] = None
    status: str = "neutral"
    is_available: bool = True
    unavailable_reason: Optional[str] = None
    formula_sql: str = ""
    comparison_label: Optional[str] = None


class BreakdownItemSchema(BaseModel):
    dimension_value: str
    metrics: Dict[str, float]
    share_pct: float
    rank: int


class LineageRecordSchema(BaseModel):
    dataset_id: str
    version_number: int
    content_hash: str
    total_rows_scanned: int
    rows_after_filters: int
    execution_time_ms: float
    filters_applied: Dict[str, Any]
    formula_registry_version: str = "v1.0"


class AnalyticsQueryResponse(BaseModel):
    metrics: Dict[str, MetricResultSchema]
    breakdown: Optional[List[BreakdownItemSchema]] = None
    lineage: Optional[LineageRecordSchema] = None


class MetricCatalogItemResponse(BaseModel):
    id: str
    label: str
    description: str
    required_roles: List[str]
    unit: str
    format_str: str
    direction: str
    is_available: bool
    missing_roles: List[str]
    resolved_columns: Dict[str, str]
    reason: Optional[str] = None


class GuardrailVerifyRequest(BaseModel):
    text: str
    fact_values: List[float]
    allowed_ordinals: Optional[List[int]] = None
    context_years: Optional[List[int]] = None
    tolerance: float = 0.01  # 1% relative tolerance


class GuardrailViolationItem(BaseModel):
    raw_token: str
    normalized_value: float
    reason: str


class GuardrailVerifyResponse(BaseModel):
    passed: bool
    total_extracted: int
    extracted_tokens: List[Dict[str, Any]]
    violations: List[GuardrailViolationItem]
    allowed_facts: List[float]
    tolerance_used: float


class TrajectoryPointSchema(BaseModel):
    month_key: str
    label: str
    revenue: float
    formatted_revenue: str
    orders: int
    delta_pct: Optional[float] = None
    projected: bool = False
    status: str = "Verified (DuckDB)"


class TrajectoryResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    total_months: int
    points: List[TrajectoryPointSchema]
    max_value: float
    min_value: float
    metric_label: str = "Revenue"
    unit: str = "currency"

