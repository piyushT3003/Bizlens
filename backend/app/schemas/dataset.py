"""BizLens Dataset Pydantic Schemas."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ColumnMappingItem(BaseModel):
    original_name: str
    role: str
    data_type: str
    confidence: float = 1.0
    confirmed: bool = False
    reasoning: Optional[str] = None


class ColumnMappingUpdatePayload(BaseModel):
    mapping: Dict[str, ColumnMappingItem]


class QualityComponentScore(BaseModel):
    completeness: float
    consistency: float
    validity: float
    uniqueness: float = 100.0
    anomaly_freedom: float = 100.0


class QualityReportResponse(BaseModel):
    score: float
    components: QualityComponentScore
    issues: List[Dict[str, Any]]
    formula_version: str = "v1.0"


class DatasetVersionSummary(BaseModel):
    id: str
    version_number: int
    row_count: int
    col_count: int
    content_hash: str
    quality_score: Optional[float] = None
    lock_version: int = 1
    label: Optional[str] = None
    created_at: str


class DatasetSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    source_filename_sanitized: str
    active_version_id: Optional[str] = None
    status: str
    row_count: int
    col_count: int
    quality_score: Optional[float] = None
    created_at: str
    updated_at: str


class DatasetDetailResponse(DatasetSummary):
    versions: List[DatasetVersionSummary]
    active_mapping: Optional[Dict[str, ColumnMappingItem]] = None
    quality_report: Optional[QualityReportResponse] = None


class DatasetPreviewResponse(BaseModel):
    dataset_id: str
    version_number: int
    total_rows: int
    columns: List[str]
    rows: List[Dict[str, Any]]


# --- Phase 6: Transformations & Quality Copilot Schemas ---

class TransformationStats(BaseModel):
    row_count: int
    col_count: int
    null_count: int
    duplicate_count: int


class TransformationPreviewRequest(BaseModel):
    type: str  # deduplicate_rows, drop_null_rows, fill_null_values, trim_strings, standardize_categories, filter_outliers, standardize_dates
    parameters: Dict[str, Any] = Field(default_factory=dict)


class TransformationPreviewResponse(BaseModel):
    type: str
    parameters: Dict[str, Any]
    rows_affected: int
    before_stats: TransformationStats
    after_stats: TransformationStats
    sample_before: List[Dict[str, Any]] = Field(default_factory=list)
    sample_after: List[Dict[str, Any]] = Field(default_factory=list)
    summary_message: str


class TransformationApplyRequest(BaseModel):
    type: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    label: Optional[str] = None
    lock_version: int = 1


class TransformationApplyResponse(BaseModel):
    transformation_id: str
    dataset_id: str
    from_version_id: str
    to_version_id: str
    new_version_number: int
    rows_affected: int
    new_row_count: int
    new_quality_score: Optional[float]
    label: str
    status: str = "applied"
    created_at: str


class TransformationHistoryItem(BaseModel):
    id: str
    dataset_id: str
    from_version_id: str
    to_version_id: str
    type: str
    parameters: Dict[str, Any]
    rows_affected: int
    before_stats: Dict[str, Any]
    after_stats: Dict[str, Any]
    status: str
    created_at: str


class QualityCopilotAction(BaseModel):
    type: str
    title: str
    description: str
    parameters: Dict[str, Any]


class QualityCopilotRequest(BaseModel):
    focus_column: Optional[str] = None
    focus_issue_code: Optional[str] = None


class QualityCopilotResponse(BaseModel):
    blocks: List[Dict[str, Any]]  # tag, content, fact_ids
    suggested_actions: List[QualityCopilotAction]
    quality_score: float
    components: QualityComponentScore
    guardrail_result: Dict[str, Any]

